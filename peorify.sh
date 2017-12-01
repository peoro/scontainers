#!/bin/bash

for file in $( find -name '*.js.proto' ); do
	out=$( echo "${file}" | sed 's/\.proto$//' )
	npx protofy ${file} > ${out}
done

exit 0


USE_PROTOCOLS_RE='^.*use\s+protocols\s+from\s+((const\s+|var\s+|let\s+|)(\w+)\s*(\W.*)?$)'


for file in $( find -name '*.js.peoro' ); do
	out=$( echo "${file}" | sed 's/\.peoro$//' )

	# echo $file $out
	useLine=$( grep -E "${USE_PROTOCOLS_RE}" "${file}" )
	protocol="$( echo "${useLine}" | sed -E "s/${USE_PROTOCOLS_RE}/\3/g" )"
	rest="$( echo "${useLine}" | sed -E "s/${USE_PROTOCOLS_RE}/\1/g" )"

	protocolReplacement=$( [ -n "${protocol}" ] && echo "${protocol}." || echo "" )

	sed -E 's/\.\*(([[:alpha:]]+)|\(([^)]+)\))/['"${protocolReplacement}"'\2\3]/g;s/'"${USE_PROTOCOLS_RE}"'/\1/g' $file > $out
	# npm run jsawk $file > $out
done
