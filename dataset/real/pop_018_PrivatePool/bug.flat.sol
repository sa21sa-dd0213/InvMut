// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Base64 {

    string internal constant _TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {

        if (data.length == 0) return "";

        string memory table = _TABLE;

        string memory result = new string(4 * ((data.length + 2) / 3));

        assembly {

            let tablePtr := add(table, 1)

            let resultPtr := add(result, 32)

            for {
                let dataPtr := data
                let endPtr := add(data, mload(data))
            } lt(dataPtr, endPtr) {

            } {

                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)

                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }
}

abstract contract ERC20 {

    event Transfer(address indexed from, address indexed to, uint256 amount);

    event Approval(address indexed owner, address indexed spender, uint256 amount);

    string public name;

    string public symbol;

    uint8 public immutable decimals;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    mapping(address => mapping(address => uint256)) public allowance;

    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        allowance[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);

        return true;
    }

    function transfer(address to, uint256 amount) public virtual returns (bool) {
        balanceOf[msg.sender] -= amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(msg.sender, to, amount);

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual returns (bool) {
        uint256 allowed = allowance[from][msg.sender];

        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;

        balanceOf[from] -= amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(from, to, amount);

        return true;
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        require(deadline >= block.timestamp, "PERMIT_DEADLINE_EXPIRED");

        unchecked {
            address recoveredAddress = ecrecover(
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        DOMAIN_SEPARATOR(),
                        keccak256(
                            abi.encode(
                                keccak256(
                                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                                ),
                                owner,
                                spender,
                                value,
                                nonces[owner]++,
                                deadline
                            )
                        )
                    )
                ),
                v,
                r,
                s
            );

            require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNER");

            allowance[recoveredAddress][spender] = value;
        }

        emit Approval(owner, spender, value);
    }

    function DOMAIN_SEPARATOR() public view virtual returns (bytes32) {
        return block.chainid == INITIAL_CHAIN_ID ? INITIAL_DOMAIN_SEPARATOR : computeDomainSeparator();
    }

    function computeDomainSeparator() internal view virtual returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                    keccak256(bytes(name)),
                    keccak256("1"),
                    block.chainid,
                    address(this)
                )
            );
    }

    function _mint(address to, uint256 amount) internal virtual {
        totalSupply += amount;

        unchecked {
            balanceOf[to] += amount;
        }

        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual {
        balanceOf[from] -= amount;

        unchecked {
            totalSupply -= amount;
        }

        emit Transfer(from, address(0), amount);
    }
}

abstract contract ERC721 {

    event Transfer(address indexed from, address indexed to, uint256 indexed id);

    event Approval(address indexed owner, address indexed spender, uint256 indexed id);

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    string public name;

    string public symbol;

    function tokenURI(uint256 id) public view virtual returns (string memory);

    mapping(uint256 => address) internal _ownerOf;

    mapping(address => uint256) internal _balanceOf;

    function ownerOf(uint256 id) public view virtual returns (address owner) {
        require((owner = _ownerOf[id]) != address(0), "NOT_MINTED");
    }

    function balanceOf(address owner) public view virtual returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");

        return _balanceOf[owner];
    }

    mapping(uint256 => address) public getApproved;

    mapping(address => mapping(address => bool)) public isApprovedForAll;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function approve(address spender, uint256 id) public virtual {
        address owner = _ownerOf[id];

        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "NOT_AUTHORIZED");

        getApproved[id] = spender;

        emit Approval(owner, spender, id);
    }

    function setApprovalForAll(address operator, bool approved) public virtual {
        isApprovedForAll[msg.sender][operator] = approved;

        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        require(from == _ownerOf[id], "WRONG_FROM");

        require(to != address(0), "INVALID_RECIPIENT");

        require(
            msg.sender == from || isApprovedForAll[from][msg.sender] || msg.sender == getApproved[id],
            "NOT_AUTHORIZED"
        );

        unchecked {
            _balanceOf[from]--;

            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        delete getApproved[id];

        emit Transfer(from, to, id);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        bytes calldata data
    ) public virtual {
        transferFrom(from, to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, from, id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return
            interfaceId == 0x01ffc9a7 ||
            interfaceId == 0x80ac58cd ||
            interfaceId == 0x5b5e139f;
    }

    function _mint(address to, uint256 id) internal virtual {
        require(to != address(0), "INVALID_RECIPIENT");

        require(_ownerOf[id] == address(0), "ALREADY_MINTED");

        unchecked {
            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        emit Transfer(address(0), to, id);
    }

    function _burn(uint256 id) internal virtual {
        address owner = _ownerOf[id];

        require(owner != address(0), "NOT_MINTED");

        unchecked {
            _balanceOf[owner]--;
        }

        delete _ownerOf[id];

        delete getApproved[id];

        emit Transfer(owner, address(0), id);
    }

    function _safeMint(address to, uint256 id) internal virtual {
        _mint(to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), id, "") ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }

    function _safeMint(
        address to,
        uint256 id,
        bytes memory data
    ) internal virtual {
        _mint(to, id);

        require(
            to.code.length == 0 ||
                ERC721TokenReceiver(to).onERC721Received(msg.sender, address(0), id, data) ==
                ERC721TokenReceiver.onERC721Received.selector,
            "UNSAFE_RECIPIENT"
        );
    }
}

abstract contract ERC721TokenReceiver {
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external virtual returns (bytes4) {
        return ERC721TokenReceiver.onERC721Received.selector;
    }
}

library FixedPointMathLib {

    uint256 internal constant MAX_UINT256 = 2**256 - 1;

    uint256 internal constant WAD = 1e18;

    function mulWadDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, y, WAD);
    }

    function mulWadUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivUp(x, y, WAD);
    }

    function divWadDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivDown(x, WAD, y);
    }

    function divWadUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulDivUp(x, WAD, y);
    }

    function mulDivDown(
        uint256 x,
        uint256 y,
        uint256 denominator
    ) internal pure returns (uint256 z) {

        assembly {

            if iszero(mul(denominator, iszero(mul(y, gt(x, div(MAX_UINT256, y)))))) {
                revert(0, 0)
            }

            z := div(mul(x, y), denominator)
        }
    }

    function mulDivUp(
        uint256 x,
        uint256 y,
        uint256 denominator
    ) internal pure returns (uint256 z) {

        assembly {

            if iszero(mul(denominator, iszero(mul(y, gt(x, div(MAX_UINT256, y)))))) {
                revert(0, 0)
            }

            z := add(gt(mod(mul(x, y), denominator), 0), div(mul(x, y), denominator))
        }
    }

    function rpow(
        uint256 x,
        uint256 n,
        uint256 scalar
    ) internal pure returns (uint256 z) {

        assembly {
            switch x
            case 0 {
                switch n
                case 0 {

                    z := scalar
                }
                default {

                    z := 0
                }
            }
            default {
                switch mod(n, 2)
                case 0 {

                    z := scalar
                }
                default {

                    z := x
                }

                let half := shr(1, scalar)

                for {

                    n := shr(1, n)
                } n {

                    n := shr(1, n)
                } {

                    if shr(128, x) {
                        revert(0, 0)
                    }

                    let xx := mul(x, x)

                    let xxRound := add(xx, half)

                    if lt(xxRound, xx) {
                        revert(0, 0)
                    }

                    x := div(xxRound, scalar)

                    if mod(n, 2) {

                        let zx := mul(z, x)

                        if iszero(eq(div(zx, x), z)) {

                            if iszero(iszero(x)) {
                                revert(0, 0)
                            }
                        }

                        let zxRound := add(zx, half)

                        if lt(zxRound, zx) {
                            revert(0, 0)
                        }

                        z := div(zxRound, scalar)
                    }
                }
            }
        }
    }

    function sqrt(uint256 x) internal pure returns (uint256 z) {

        assembly {
            let y := x

            z := 181

            if iszero(lt(y, 0x10000000000000000000000000000000000)) {
                y := shr(128, y)
                z := shl(64, z)
            }
            if iszero(lt(y, 0x1000000000000000000)) {
                y := shr(64, y)
                z := shl(32, z)
            }
            if iszero(lt(y, 0x10000000000)) {
                y := shr(32, y)
                z := shl(16, z)
            }
            if iszero(lt(y, 0x1000000)) {
                y := shr(16, y)
                z := shl(8, z)
            }

            z := shr(18, mul(z, add(y, 65536)))

            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))
            z := shr(1, add(z, div(x, z)))

            z := sub(z, lt(div(x, z), z))
        }
    }

    function unsafeMod(uint256 x, uint256 y) internal pure returns (uint256 z) {

        assembly {

            z := mod(x, y)
        }
    }

    function unsafeDiv(uint256 x, uint256 y) internal pure returns (uint256 r) {

        assembly {

            r := div(x, y)
        }
    }

    function unsafeDivUp(uint256 x, uint256 y) internal pure returns (uint256 z) {

        assembly {

            z := add(gt(mod(x, y), 0), div(x, y))
        }
    }
}

interface IERC165_0 {

    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC165_1 {

    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC3156FlashBorrower {

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

interface IStolenNftOracle {

    struct Message {
        bytes32 id;
        bytes payload;

        uint256 timestamp;

        bytes signature;
    }

    function validateTokensAreNotStolen(address tokenAddress, uint256[] calldata tokenIds, Message[] calldata proofs)
        external;
}

library LibClone {

    error DeploymentFailed();

    error SaltDoesNotStartWithCaller();

    function clone(address implementation) internal returns (address instance) {

        assembly {

            mstore(0x21, 0x5af43d3d93803e602a57fd5bf3)
            mstore(0x14, implementation)
            mstore(0x00, 0x602c3d8160093d39f33d3d3d3d363d3d37363d73)
            instance := create(0, 0x0c, 0x35)

            mstore(0x21, 0)

            if iszero(instance) {

                mstore(0x00, 0x30116425)

                revert(0x1c, 0x04)
            }
        }
    }

    function cloneDeterministic(address implementation, bytes32 salt)
        internal
        returns (address instance)
    {

        assembly {
            mstore(0x21, 0x5af43d3d93803e602a57fd5bf3)
            mstore(0x14, implementation)
            mstore(0x00, 0x602c3d8160093d39f33d3d3d3d363d3d37363d73)
            instance := create2(0, 0x0c, 0x35, salt)

            mstore(0x21, 0)

            if iszero(instance) {

                mstore(0x00, 0x30116425)

                revert(0x1c, 0x04)
            }
        }
    }

    function initCodeHash(address implementation) internal pure returns (bytes32 hash) {

        assembly {
            mstore(0x21, 0x5af43d3d93803e602a57fd5bf3)
            mstore(0x14, implementation)
            mstore(0x00, 0x602c3d8160093d39f33d3d3d3d363d3d37363d73)
            hash := keccak256(0x0c, 0x35)

            mstore(0x21, 0)
        }
    }

    function predictDeterministicAddress(address implementation, bytes32 salt, address deployer)
        internal
        pure
        returns (address predicted)
    {
        bytes32 hash = initCodeHash(implementation);
        predicted = predictDeterministicAddress(hash, salt, deployer);
    }

    function clone(address implementation, bytes memory data) internal returns (address instance) {
        assembly {

            let mBefore3 := mload(sub(data, 0x60))
            let mBefore2 := mload(sub(data, 0x40))
            let mBefore1 := mload(sub(data, 0x20))
            let dataLength := mload(data)
            let dataEnd := add(add(data, 0x20), dataLength)
            let mAfter1 := mload(dataEnd)

            let extraLength := add(dataLength, 2)

            mstore(data, 0x5af43d3d93803e606057fd5bf3)

            mstore(sub(data, 0x0d), implementation)

            mstore(
                sub(data, 0x21),
                or(shl(0x48, extraLength), 0x593da1005b363d3d373d3d3d3d610000806062363936013d73)
            )

            mstore(
                sub(data, 0x3a), 0x9e4ac34f21c619cefc926c8bd93b54bf5a39c7ab2127a895af1cc0691d7e3dff
            )
            mstore(
                sub(data, 0x5a),
                or(shl(0x78, add(extraLength, 0x62)), 0x6100003d81600a3d39f336602c57343d527f)
            )
            mstore(dataEnd, shl(0xf0, extraLength))

            instance := create(0, sub(data, 0x4c), add(extraLength, 0x6c))

            if iszero(instance) {

                mstore(0x00, 0x30116425)

                revert(0x1c, 0x04)
            }

            mstore(dataEnd, mAfter1)
            mstore(data, dataLength)
            mstore(sub(data, 0x20), mBefore1)
            mstore(sub(data, 0x40), mBefore2)
            mstore(sub(data, 0x60), mBefore3)
        }
    }

    function cloneDeterministic(address implementation, bytes memory data, bytes32 salt)
        internal
        returns (address instance)
    {
        assembly {

            let mBefore3 := mload(sub(data, 0x60))
            let mBefore2 := mload(sub(data, 0x40))
            let mBefore1 := mload(sub(data, 0x20))
            let dataLength := mload(data)
            let dataEnd := add(add(data, 0x20), dataLength)
            let mAfter1 := mload(dataEnd)

            let extraLength := add(dataLength, 2)

            mstore(data, 0x5af43d3d93803e606057fd5bf3)

            mstore(sub(data, 0x0d), implementation)

            mstore(
                sub(data, 0x21),
                or(shl(0x48, extraLength), 0x593da1005b363d3d373d3d3d3d610000806062363936013d73)
            )

            mstore(
                sub(data, 0x3a), 0x9e4ac34f21c619cefc926c8bd93b54bf5a39c7ab2127a895af1cc0691d7e3dff
            )
            mstore(
                sub(data, 0x5a),
                or(shl(0x78, add(extraLength, 0x62)), 0x6100003d81600a3d39f336602c57343d527f)
            )
            mstore(dataEnd, shl(0xf0, extraLength))

            instance := create2(0, sub(data, 0x4c), add(extraLength, 0x6c), salt)

            if iszero(instance) {

                mstore(0x00, 0x30116425)

                revert(0x1c, 0x04)
            }

            mstore(dataEnd, mAfter1)
            mstore(data, dataLength)
            mstore(sub(data, 0x20), mBefore1)
            mstore(sub(data, 0x40), mBefore2)
            mstore(sub(data, 0x60), mBefore3)
        }
    }

    function initCodeHash(address implementation, bytes memory data)
        internal
        pure
        returns (bytes32 hash)
    {
        assembly {

            let mBefore3 := mload(sub(data, 0x60))
            let mBefore2 := mload(sub(data, 0x40))
            let mBefore1 := mload(sub(data, 0x20))
            let dataLength := mload(data)
            let dataEnd := add(add(data, 0x20), dataLength)
            let mAfter1 := mload(dataEnd)

            let extraLength := add(dataLength, 2)

            mstore(data, 0x5af43d3d93803e606057fd5bf3)

            mstore(sub(data, 0x0d), implementation)

            mstore(
                sub(data, 0x21),
                or(shl(0x48, extraLength), 0x593da1005b363d3d373d3d3d3d610000806062363936013d73)
            )

            mstore(
                sub(data, 0x3a), 0x9e4ac34f21c619cefc926c8bd93b54bf5a39c7ab2127a895af1cc0691d7e3dff
            )
            mstore(
                sub(data, 0x5a),
                or(shl(0x78, add(extraLength, 0x62)), 0x6100003d81600a3d39f336602c57343d527f)
            )
            mstore(dataEnd, shl(0xf0, extraLength))

            hash := keccak256(sub(data, 0x4c), add(extraLength, 0x6c))

            mstore(dataEnd, mAfter1)
            mstore(data, dataLength)
            mstore(sub(data, 0x20), mBefore1)
            mstore(sub(data, 0x40), mBefore2)
            mstore(sub(data, 0x60), mBefore3)
        }
    }

    function predictDeterministicAddress(
        address implementation,
        bytes memory data,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        bytes32 hash = initCodeHash(implementation, data);
        predicted = predictDeterministicAddress(hash, salt, deployer);
    }

    function predictDeterministicAddress(bytes32 hash, bytes32 salt, address deployer)
        internal
        pure
        returns (address predicted)
    {

        assembly {

            mstore8(0x00, 0xff)
            mstore(0x35, hash)
            mstore(0x01, shl(96, deployer))
            mstore(0x15, salt)
            predicted := keccak256(0x00, 0x55)

            mstore(0x35, 0)
        }
    }

    function checkStartsWithCaller(bytes32 salt) internal view {

        assembly {

            if iszero(or(iszero(shr(96, salt)), eq(caller(), shr(96, salt)))) {

                mstore(0x00, 0x2f634836)

                revert(0x1c, 0x04)
            }
        }
    }
}

library Math {
    enum Rounding {
        Down,
        Up,
        Zero
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function average(uint256 a, uint256 b) internal pure returns (uint256) {

        return (a & b) + (a ^ b) / 2;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {

        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    function mulDiv(
        uint256 x,
        uint256 y,
        uint256 denominator
    ) internal pure returns (uint256 result) {
        unchecked {

            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(x, y, not(0))
                prod0 := mul(x, y)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            if (prod1 == 0) {
                return prod0 / denominator;
            }

            require(denominator > prod1);

            uint256 remainder;
            assembly {

                remainder := mulmod(x, y, denominator)

                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }

            uint256 twos = denominator & (~denominator + 1);
            assembly {

                denominator := div(denominator, twos)

                prod0 := div(prod0, twos)

                twos := add(div(sub(0, twos), twos), 1)
            }

            prod0 |= prod1 * twos;

            uint256 inverse = (3 * denominator) ^ 2;

            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;
            inverse *= 2 - denominator * inverse;

            result = prod0 * inverse;
            return result;
        }
    }

    function mulDiv(
        uint256 x,
        uint256 y,
        uint256 denominator,
        Rounding rounding
    ) internal pure returns (uint256) {
        uint256 result = mulDiv(x, y, denominator);
        if (rounding == Rounding.Up && mulmod(x, y, denominator) > 0) {
            result += 1;
        }
        return result;
    }

    function sqrt(uint256 a) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }

        uint256 result = 1 << (log2(a) >> 1);

        unchecked {
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            result = (result + a / result) >> 1;
            return min(result, a / result);
        }
    }

    function sqrt(uint256 a, Rounding rounding) internal pure returns (uint256) {
        unchecked {
            uint256 result = sqrt(a);
            return result + (rounding == Rounding.Up && result * result < a ? 1 : 0);
        }
    }

    function log2(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) {
                value >>= 128;
                result += 128;
            }
            if (value >> 64 > 0) {
                value >>= 64;
                result += 64;
            }
            if (value >> 32 > 0) {
                value >>= 32;
                result += 32;
            }
            if (value >> 16 > 0) {
                value >>= 16;
                result += 16;
            }
            if (value >> 8 > 0) {
                value >>= 8;
                result += 8;
            }
            if (value >> 4 > 0) {
                value >>= 4;
                result += 4;
            }
            if (value >> 2 > 0) {
                value >>= 2;
                result += 2;
            }
            if (value >> 1 > 0) {
                result += 1;
            }
        }
        return result;
    }

    function log2(uint256 value, Rounding rounding) internal pure returns (uint256) {
        unchecked {
            uint256 result = log2(value);
            return result + (rounding == Rounding.Up && 1 << result < value ? 1 : 0);
        }
    }

    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10**64) {
                value /= 10**64;
                result += 64;
            }
            if (value >= 10**32) {
                value /= 10**32;
                result += 32;
            }
            if (value >= 10**16) {
                value /= 10**16;
                result += 16;
            }
            if (value >= 10**8) {
                value /= 10**8;
                result += 8;
            }
            if (value >= 10**4) {
                value /= 10**4;
                result += 4;
            }
            if (value >= 10**2) {
                value /= 10**2;
                result += 2;
            }
            if (value >= 10**1) {
                result += 1;
            }
        }
        return result;
    }

    function log10(uint256 value, Rounding rounding) internal pure returns (uint256) {
        unchecked {
            uint256 result = log10(value);
            return result + (rounding == Rounding.Up && 10**result < value ? 1 : 0);
        }
    }

    function log256(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) {
                value >>= 128;
                result += 16;
            }
            if (value >> 64 > 0) {
                value >>= 64;
                result += 8;
            }
            if (value >> 32 > 0) {
                value >>= 32;
                result += 4;
            }
            if (value >> 16 > 0) {
                value >>= 16;
                result += 2;
            }
            if (value >> 8 > 0) {
                result += 1;
            }
        }
        return result;
    }

    function log256(uint256 value, Rounding rounding) internal pure returns (uint256) {
        unchecked {
            uint256 result = log256(value);
            return result + (rounding == Rounding.Up && 1 << (result * 8) < value ? 1 : 0);
        }
    }
}

library MerkleProofLib {

    function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf)
        internal
        pure
        returns (bool isValid)
    {

        assembly {
            if mload(proof) {

                let offset := add(proof, 0x20)

                let end := add(offset, shl(5, mload(proof)))

                for {} 1 {} {

                    let scratch := shl(5, gt(leaf, mload(offset)))

                    mstore(scratch, leaf)
                    mstore(xor(scratch, 0x20), mload(offset))

                    leaf := keccak256(0x00, 0x40)
                    offset := add(offset, 0x20)
                    if iszero(lt(offset, end)) { break }
                }
            }
            isValid := eq(leaf, root)
        }
    }

    function verifyCalldata(bytes32[] calldata proof, bytes32 root, bytes32 leaf)
        internal
        pure
        returns (bool isValid)
    {

        assembly {
            if proof.length {

                let end := add(proof.offset, shl(5, proof.length))

                let offset := proof.offset

                for {} 1 {} {

                    let scratch := shl(5, gt(leaf, calldataload(offset)))

                    mstore(scratch, leaf)
                    mstore(xor(scratch, 0x20), calldataload(offset))

                    leaf := keccak256(0x00, 0x40)
                    offset := add(offset, 0x20)
                    if iszero(lt(offset, end)) { break }
                }
            }
            isValid := eq(leaf, root)
        }
    }

    function verifyMultiProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32[] memory leafs,
        bool[] memory flags
    ) internal pure returns (bool isValid) {

        assembly {

            let leafsLength := mload(leafs)
            let proofLength := mload(proof)
            let flagsLength := mload(flags)

            leafs := add(0x20, leafs)
            proof := add(0x20, proof)
            flags := add(0x20, flags)

            for {} eq(add(leafsLength, proofLength), add(flagsLength, 1)) {} {

                if iszero(flagsLength) {

                    isValid := eq(mload(xor(leafs, mul(xor(proof, leafs), proofLength))), root)
                    break
                }

                let hashesFront := mload(0x40)

                leafsLength := shl(5, leafsLength)
                for { let i := 0 } iszero(eq(i, leafsLength)) { i := add(i, 0x20) } {
                    mstore(add(hashesFront, i), mload(add(leafs, i)))
                }

                let hashesBack := add(hashesFront, leafsLength)

                flagsLength := add(hashesBack, shl(5, flagsLength))

                for {} 1 {} {

                    let a := mload(hashesFront)

                    let b := mload(add(hashesFront, 0x20))
                    hashesFront := add(hashesFront, 0x40)

                    if iszero(mload(flags)) {

                        b := mload(proof)
                        proof := add(proof, 0x20)

                        hashesFront := sub(hashesFront, 0x20)
                    }

                    flags := add(flags, 0x20)

                    let scratch := shl(5, gt(a, b))

                    mstore(scratch, a)
                    mstore(xor(scratch, 0x20), b)
                    mstore(hashesBack, keccak256(0x00, 0x40))
                    hashesBack := add(hashesBack, 0x20)
                    if iszero(lt(hashesBack, flagsLength)) { break }
                }

                isValid := eq(mload(sub(hashesBack, 0x20)), root)
                break
            }
        }
    }

    function verifyMultiProofCalldata(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32[] calldata leafs,
        bool[] calldata flags
    ) internal pure returns (bool isValid) {

        assembly {

            for {} eq(add(leafs.length, proof.length), add(flags.length, 1)) {} {

                if iszero(flags.length) {

                    isValid := eq(
                        calldataload(
                            xor(leafs.offset, mul(xor(proof.offset, leafs.offset), proof.length))
                        ),
                        root
                    )
                    break
                }

                let hashesFront := mload(0x40)

                calldatacopy(hashesFront, leafs.offset, shl(5, leafs.length))

                let hashesBack := add(hashesFront, shl(5, leafs.length))

                flags.length := add(hashesBack, shl(5, flags.length))

                for {} 1 {} {

                    let a := mload(hashesFront)

                    let b := mload(add(hashesFront, 0x20))
                    hashesFront := add(hashesFront, 0x40)

                    if iszero(calldataload(flags.offset)) {

                        b := calldataload(proof.offset)
                        proof.offset := add(proof.offset, 0x20)

                        hashesFront := sub(hashesFront, 0x20)
                    }

                    flags.offset := add(flags.offset, 0x20)

                    let scratch := shl(5, gt(a, b))

                    mstore(scratch, a)
                    mstore(xor(scratch, 0x20), b)
                    mstore(hashesBack, keccak256(0x00, 0x40))
                    hashesBack := add(hashesBack, 0x20)
                    if iszero(lt(hashesBack, flags.length)) { break }
                }

                isValid := eq(mload(sub(hashesBack, 0x20)), root)
                break
            }
        }
    }

    function emptyProof() internal pure returns (bytes32[] calldata proof) {

        assembly {
            proof.length := 0
        }
    }

    function emptyLeafs() internal pure returns (bytes32[] calldata leafs) {

        assembly {
            leafs.length := 0
        }
    }

    function emptyFlags() internal pure returns (bool[] calldata flags) {

        assembly {
            flags.length := 0
        }
    }
}

abstract contract Owned {

    event OwnershipTransferred(address indexed user, address indexed newOwner);

    address public owner;

    modifier onlyOwner() virtual {
        require(msg.sender == owner, "UNAUTHORIZED");

        _;
    }

    constructor(address _owner) {
        owner = _owner;

        emit OwnershipTransferred(address(0), _owner);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        owner = newOwner;

        emit OwnershipTransferred(msg.sender, newOwner);
    }
}

interface IERC2981 is IERC165_0 {

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
}

interface IERC3156FlashLender {

    function maxFlashLoan(address token) external view returns (uint256);

    function flashFee(address token, uint256 amount) external view returns (uint256);

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}

interface IRoyaltyRegistry is IERC165_1 {
    event RoyaltyOverride(address owner, address tokenAddress, address royaltyAddress);

    function setRoyaltyLookupAddress(address tokenAddress, address royaltyAddress) external returns (bool);

    function getRoyaltyLookupAddress(address tokenAddress) external view returns (address);

    function getOverrideLookupTokenAddress(address overrideAddress) external view returns (address);

    function overrideAllowed(address tokenAddress) external view returns (bool);
}

library SafeTransferLib {

    function safeTransferETH(address to, uint256 amount) internal {
        bool success;

        assembly {

            success := call(gas(), to, amount, 0, 0, 0, 0)
        }

        require(success, "ETH_TRANSFER_FAILED");
    }

    function safeTransferFrom(
        ERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0x23b872dd00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), from)
            mstore(add(freeMemoryPointer, 36), to)
            mstore(add(freeMemoryPointer, 68), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 100, 0, 32)
            )
        }

        require(success, "TRANSFER_FROM_FAILED");
    }

    function safeTransfer(
        ERC20 token,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0xa9059cbb00000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), to)
            mstore(add(freeMemoryPointer, 36), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "TRANSFER_FAILED");
    }

    function safeApprove(
        ERC20 token,
        address to,
        uint256 amount
    ) internal {
        bool success;

        assembly {

            let freeMemoryPointer := mload(0x40)

            mstore(freeMemoryPointer, 0x095ea7b300000000000000000000000000000000000000000000000000000000)
            mstore(add(freeMemoryPointer, 4), to)
            mstore(add(freeMemoryPointer, 36), amount)

            success := and(

                or(and(eq(mload(0), 1), gt(returndatasize(), 31)), iszero(returndatasize())),

                call(gas(), token, 0, freeMemoryPointer, 68, 0, 32)
            )
        }

        require(success, "APPROVE_FAILED");
    }
}

library Strings {
    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    function toString(uint256 value) internal pure returns (string memory) {
        unchecked {
            uint256 length = Math.log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;

            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;

                assembly {
                    mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        unchecked {
            return toHexString(value, Math.log256(value) + 1);
        }
    }

    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
    }
}

contract Factory is ERC721, Owned {
    using LibClone for address;
    using SafeTransferLib for address;

    event Create(address indexed privatePool, uint256[] tokenIds, uint256 baseTokenAmount);
    event Withdraw(address indexed token, uint256 indexed amount);

    address public privatePoolImplementation;

    address public privatePoolMetadata;

    uint16 public protocolFeeRate;

    constructor() ERC721("Caviar Private Pools", "POOL") Owned(msg.sender) {}

    receive() external payable {}

    function create(
        address _baseToken,
        address _nft,
        uint128 _virtualBaseTokenReserves,
        uint128 _virtualNftReserves,
        uint56 _changeFee,
        uint16 _feeRate,
        bytes32 _merkleRoot,
        bool _useStolenNftOracle,
        bool _payRoyalties,
        bytes32 _salt,
        uint256[] memory tokenIds,
        uint256 baseTokenAmount
    ) public payable returns (PrivatePool privatePool) {

        if ((_baseToken == address(0) && msg.value != baseTokenAmount) || (_baseToken != address(0) && msg.value > 0)) {
            revert PrivatePool.InvalidEthAmount();
        }

        privatePool = PrivatePool(payable(privatePoolImplementation.cloneDeterministic(_salt)));

        _safeMint(msg.sender, uint256(uint160(address(privatePool))));

        privatePool.initialize(
            _baseToken,
            _nft,
            _virtualBaseTokenReserves,
            _virtualNftReserves,
            _changeFee,
            _feeRate,
            _merkleRoot,
            _useStolenNftOracle,
            _payRoyalties
        );

        if (_baseToken == address(0)) {

            address(privatePool).safeTransferETH(baseTokenAmount);
        } else {

            ERC20(_baseToken).transferFrom(msg.sender, address(privatePool), baseTokenAmount);
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            ERC721(_nft).safeTransferFrom(msg.sender, address(privatePool), tokenIds[i]);
        }

        emit Create(address(privatePool), tokenIds, baseTokenAmount);
    }

    function setPrivatePoolMetadata(address _privatePoolMetadata) public onlyOwner {
        privatePoolMetadata = _privatePoolMetadata;
    }

    function setPrivatePoolImplementation(address _privatePoolImplementation) public onlyOwner {
        privatePoolImplementation = _privatePoolImplementation;
    }

    function setProtocolFeeRate(uint16 _protocolFeeRate) public onlyOwner {
        protocolFeeRate = _protocolFeeRate;
    }

    function withdraw(address token, uint256 amount) public onlyOwner {
        if (token == address(0)) {
            msg.sender.safeTransferETH(amount);
        } else {
            ERC20(token).transfer(msg.sender, amount);
        }

        emit Withdraw(token, amount);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        return PrivatePoolMetadata(privatePoolMetadata).tokenURI(id);
    }

    function predictPoolDeploymentAddress(bytes32 salt) public view returns (address predictedAddress) {
        predictedAddress = privatePoolImplementation.predictDeterministicAddress(salt, address(this));
    }
}

contract PrivatePoolMetadata {

    function tokenURI(uint256 tokenId) public view returns (string memory) {

        bytes memory metadata = abi.encodePacked(
            "{",
                '"name": "Private Pool ',Strings.toString(tokenId),'",',
                '"description": "Caviar private pool AMM position.",',
                '"image": ','"data:image/svg+xml;base64,', Base64.encode(svg(tokenId)),'",',
                '"attributes": [',
                    attributes(tokenId),
                "]",
            "}"
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(metadata)));
    }

    function attributes(uint256 tokenId) public view returns (string memory) {
        PrivatePool privatePool = PrivatePool(payable(address(uint160(tokenId))));

        bytes memory _attributes = abi.encodePacked(
            trait("Pool address", Strings.toHexString(address(privatePool))), ',',
            trait("Base token", Strings.toHexString(privatePool.baseToken())), ',',
            trait("NFT", Strings.toHexString(privatePool.nft())), ',',
            trait("Virtual base token reserves",Strings.toString(privatePool.virtualBaseTokenReserves())), ',',
            trait("Virtual NFT reserves", Strings.toString(privatePool.virtualNftReserves())), ',',
            trait("Fee rate (bps): ", Strings.toString(privatePool.feeRate())), ',',
            trait("NFT balance", Strings.toString(ERC721(privatePool.nft()).balanceOf(address(privatePool)))), ',',
            trait("Base token balance",  Strings.toString(privatePool.baseToken() == address(0) ? address(privatePool).balance : ERC20(privatePool.baseToken()).balanceOf(address(privatePool))))
        );

        return string(_attributes);
    }

    function svg(uint256 tokenId) public view returns (bytes memory) {
        PrivatePool privatePool = PrivatePool(payable(address(uint160(tokenId))));

        bytes memory _svg;
        {

            _svg = abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" style="width:100%;background:black;fill:white;font-family:serif;">',
                    '<text x="24px" y="24px" font-size="12">',
                        "Caviar AMM private pool position",
                    "</text>",
                    '<text x="24px" y="48px" font-size="12">',
                        "Private pool: ", Strings.toHexString(address(privatePool)),
                    "</text>",
                    '<text x="24px" y="72px" font-size="12">',
                        "Base token: ", Strings.toHexString(privatePool.baseToken()),
                    "</text>",
                    '<text x="24px" y="96px" font-size="12">',
                        "NFT: ", Strings.toHexString(privatePool.nft()),
                    "</text>"
            );
        }

        {

            _svg = abi.encodePacked(
                _svg,
                '<text x="24px" y="120px" font-size="12">',
                    "Virtual base token reserves: ", Strings.toString(privatePool.virtualBaseTokenReserves()),
                "</text>",
                '<text x="24px" y="144px" font-size="12">',
                    "Virtual NFT reserves: ", Strings.toString(privatePool.virtualNftReserves()),
                "</text>",
                '<text x="24px" y="168px" font-size="12">',
                    "Fee rate (bps): ", Strings.toString(privatePool.feeRate()),
                "</text>"
            );
        }

        {

            _svg = abi.encodePacked(
                _svg,
                    '<text x="24px" y="192px" font-size="12">',
                        "NFT balance: ", Strings.toString(ERC721(privatePool.nft()).balanceOf(address(privatePool))),
                    "</text>",
                    '<text x="24px" y="216px" font-size="12">',
                        "Base token balance: ", Strings.toString(privatePool.baseToken() == address(0) ? address(privatePool).balance : ERC20(privatePool.baseToken()).balanceOf(address(privatePool))),
                    "</text>",
                "</svg>"
            );
        }

        return _svg;
    }

    function trait(string memory traitType, string memory value) internal pure returns (string memory) {

        return string(
            abi.encodePacked(
                '{ "trait_type": "', traitType, '",', '"value": "', value, '" }'
            )
        );
    }
}

contract PrivatePool is ERC721TokenReceiver {
    using SafeTransferLib for address payable;
    using SafeTransferLib for address;
    using SafeTransferLib for ERC20;

    struct MerkleMultiProof {
        bytes32[] proof;
        bool[] flags;
    }

    event Initialize(address indexed baseToken, address indexed nft, uint128 virtualBaseTokenReserves, uint128 virtualNftReserves, uint56 changeFee, uint16 feeRate, bytes32 merkleRoot, bool useStolenNftOracle, bool payRoyalties);
    event Buy(uint256[] tokenIds, uint256[] tokenWeights, uint256 inputAmount, uint256 feeAmount, uint256 protocolFeeAmount, uint256 royaltyFeeAmount);
    event Sell(uint256[] tokenIds, uint256[] tokenWeights, uint256 outputAmount, uint256 feeAmount, uint256 protocolFeeAmount, uint256 royaltyFeeAmount);
    event Deposit(uint256[] tokenIds, uint256 baseTokenAmount);
    event Withdraw(address indexed nft, uint256[] tokenIds, address token, uint256 amount);
    event Change(uint256[] inputTokenIds, uint256[] inputTokenWeights, uint256[] outputTokenIds, uint256[] outputTokenWeights, uint256 feeAmount, uint256 protocolFeeAmount);
    event SetVirtualReserves(uint128 virtualBaseTokenReserves, uint128 virtualNftReserves);
    event SetMerkleRoot(bytes32 merkleRoot);
    event SetFeeRate(uint16 feeRate);
    event SetUseStolenNftOracle(bool useStolenNftOracle);
    event SetPayRoyalties(bool payRoyalties);

    error AlreadyInitialized();
    error Unauthorized();
    error InvalidEthAmount();
    error InvalidMerkleProof();
    error InsufficientInputWeight();
    error FeeRateTooHigh();
    error NotAvailableForFlashLoan();
    error FlashLoanFailed();
    error InvalidRoyaltyFee();

    address public baseToken;

    address public nft;

    uint56 public changeFee;

    uint16 public feeRate;

    bool public initialized;

    bool public payRoyalties;

    bool public useStolenNftOracle;

    uint128 public virtualBaseTokenReserves;

    uint128 public virtualNftReserves;

    bytes32 public merkleRoot;

    address public immutable stolenNftOracle;

    address payable public immutable factory;

    address public immutable royaltyRegistry;

    modifier onlyOwner() virtual {
        if (msg.sender != Factory(factory).ownerOf(uint160(address(this)))) {
            revert Unauthorized();
        }
        _;
    }

    receive() external payable {}

    constructor(address _factory, address _royaltyRegistry, address _stolenNftOracle) {
        factory = payable(_factory);
        royaltyRegistry = _royaltyRegistry;
        stolenNftOracle = _stolenNftOracle;
    }

    function initialize(
        address _baseToken,
        address _nft,
        uint128 _virtualBaseTokenReserves,
        uint128 _virtualNftReserves,
        uint56 _changeFee,
        uint16 _feeRate,
        bytes32 _merkleRoot,
        bool _useStolenNftOracle,
        bool _payRoyalties
    ) public {

        if (initialized) revert AlreadyInitialized();

        if (_feeRate > 5_000) revert FeeRateTooHigh();

        baseToken = _baseToken;
        nft = _nft;
        virtualBaseTokenReserves = _virtualBaseTokenReserves;
        virtualNftReserves = _virtualNftReserves;
        changeFee = _changeFee;
        feeRate = _feeRate;
        merkleRoot = _merkleRoot;
        useStolenNftOracle = _useStolenNftOracle;
        payRoyalties = _payRoyalties;

        initialized = true;

        emit Initialize(
            _baseToken,
            _nft,
            _virtualBaseTokenReserves,
            _virtualNftReserves,
            _changeFee,
            _feeRate,
            _merkleRoot,
            _useStolenNftOracle,
            _payRoyalties
        );
    }

    function buy(uint256[] calldata tokenIds, uint256[] calldata tokenWeights, MerkleMultiProof calldata proof)
        public
        payable
        returns (uint256 netInputAmount, uint256 feeAmount, uint256 protocolFeeAmount)
    {

        uint256 weightSum = sumWeightsAndValidateProof(tokenIds, tokenWeights, proof);

        (netInputAmount, feeAmount, protocolFeeAmount) = buyQuote(weightSum);

        if (baseToken != address(0) && msg.value > 0) revert InvalidEthAmount();

        virtualBaseTokenReserves += uint128(netInputAmount - feeAmount - protocolFeeAmount);
        virtualNftReserves -= uint128(weightSum);

        uint256 salePrice = (netInputAmount - feeAmount - protocolFeeAmount) / tokenIds.length;
        uint256 royaltyFeeAmount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {

            ERC721(nft).safeTransferFrom(address(this), msg.sender, tokenIds[i]);

            if (payRoyalties) {

                (uint256 royaltyFee,) = _getRoyalty(tokenIds[i], salePrice);

                royaltyFeeAmount += royaltyFee;
            }
        }

        netInputAmount += royaltyFeeAmount;

        if (baseToken != address(0)) {

            ERC20(baseToken).safeTransferFrom(msg.sender, address(this), netInputAmount);

            if (protocolFeeAmount > 0) ERC20(baseToken).safeTransfer(address(factory), protocolFeeAmount);
        } else {

            if (msg.value < netInputAmount) revert InvalidEthAmount();

            if (protocolFeeAmount > 0) factory.safeTransferETH(protocolFeeAmount);

            if (msg.value > netInputAmount) msg.sender.safeTransferETH(msg.value - netInputAmount);
        }

        if (payRoyalties) {
            for (uint256 i = 0; i < tokenIds.length; i++) {

                (uint256 royaltyFee, address recipient) = _getRoyalty(tokenIds[i], salePrice);

                if (royaltyFee > 0 && recipient != address(0)) {
                    if (baseToken != address(0)) {
                        ERC20(baseToken).safeTransfer(recipient, royaltyFee);
                    } else {
                        recipient.safeTransferETH(royaltyFee);
                    }
                }
            }
        }

        emit Buy(tokenIds, tokenWeights, netInputAmount, feeAmount, protocolFeeAmount, royaltyFeeAmount);
    }

    function sell(
        uint256[] calldata tokenIds,
        uint256[] calldata tokenWeights,
        MerkleMultiProof calldata proof,
        IStolenNftOracle.Message[] memory stolenNftProofs
    ) public returns (uint256 netOutputAmount, uint256 feeAmount, uint256 protocolFeeAmount) {

        uint256 weightSum = sumWeightsAndValidateProof(tokenIds, tokenWeights, proof);

        (netOutputAmount, feeAmount, protocolFeeAmount) = sellQuote(weightSum);

        if (useStolenNftOracle) {
            IStolenNftOracle(stolenNftOracle).validateTokensAreNotStolen(nft, tokenIds, stolenNftProofs);
        }

        virtualBaseTokenReserves -= uint128(netOutputAmount + protocolFeeAmount + feeAmount);
        virtualNftReserves += uint128(weightSum);

        uint256 royaltyFeeAmount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {

            ERC721(nft).safeTransferFrom(msg.sender, address(this), tokenIds[i]);

            if (payRoyalties) {

                uint256 salePrice = (netOutputAmount + feeAmount + protocolFeeAmount) / tokenIds.length;

                (uint256 royaltyFee, address recipient) = _getRoyalty(tokenIds[i], salePrice);

                royaltyFeeAmount += royaltyFee;

                if (royaltyFee > 0 && recipient != address(0)) {
                    if (baseToken != address(0)) {
                        ERC20(baseToken).safeTransfer(recipient, royaltyFee);
                    } else {
                        recipient.safeTransferETH(royaltyFee);
                    }
                }
            }
        }

        netOutputAmount -= royaltyFeeAmount;

        if (baseToken == address(0)) {

            msg.sender.safeTransferETH(netOutputAmount);

            if (protocolFeeAmount > 0) factory.safeTransferETH(protocolFeeAmount);
        } else {

            ERC20(baseToken).transfer(msg.sender, netOutputAmount);

            if (protocolFeeAmount > 0) ERC20(baseToken).safeTransfer(address(factory), protocolFeeAmount);
        }

        emit Sell(tokenIds, tokenWeights, netOutputAmount, feeAmount, protocolFeeAmount, royaltyFeeAmount);
    }

    function change(
        uint256[] memory inputTokenIds,
        uint256[] memory inputTokenWeights,
        MerkleMultiProof memory inputProof,
        IStolenNftOracle.Message[] memory stolenNftProofs,
        uint256[] memory outputTokenIds,
        uint256[] memory outputTokenWeights,
        MerkleMultiProof memory outputProof
    ) public payable returns (uint256 feeAmount, uint256 protocolFeeAmount) {

        if (baseToken != address(0) && msg.value > 0) revert InvalidEthAmount();

        if (useStolenNftOracle) {
            IStolenNftOracle(stolenNftOracle).validateTokensAreNotStolen(nft, inputTokenIds, stolenNftProofs);
        }

        {

            uint256 inputWeightSum = sumWeightsAndValidateProof(inputTokenIds, inputTokenWeights, inputProof);

            uint256 outputWeightSum = sumWeightsAndValidateProof(outputTokenIds, outputTokenWeights, outputProof);

            if (inputWeightSum < outputWeightSum) revert InsufficientInputWeight();

            (feeAmount, protocolFeeAmount) = changeFeeQuote(inputWeightSum);
        }

        if (baseToken != address(0)) {

            ERC20(baseToken).safeTransferFrom(msg.sender, address(this), feeAmount);

            if (protocolFeeAmount > 0) ERC20(baseToken).safeTransferFrom(msg.sender, factory, protocolFeeAmount);
        } else {

            if (msg.value < feeAmount + protocolFeeAmount) revert InvalidEthAmount();

            if (protocolFeeAmount > 0) factory.safeTransferETH(protocolFeeAmount);

            if (msg.value > feeAmount + protocolFeeAmount) {
                msg.sender.safeTransferETH(msg.value - feeAmount - protocolFeeAmount);
            }
        }

        for (uint256 i = 0; i < inputTokenIds.length; i++) {
            ERC721(nft).safeTransferFrom(msg.sender, address(this), inputTokenIds[i]);
        }

        for (uint256 i = 0; i < outputTokenIds.length; i++) {
            ERC721(nft).safeTransferFrom(address(this), msg.sender, outputTokenIds[i]);
        }

        emit Change(inputTokenIds, inputTokenWeights, outputTokenIds, outputTokenWeights, feeAmount, protocolFeeAmount);
    }

    function execute(address target, bytes memory data) public payable onlyOwner returns (bytes memory) {

        (bool success, bytes memory returnData) = target.call{value: msg.value}(data);

        if (success) return returnData;

        if (returnData.length > 0) {

            assembly {
                let returnData_size := mload(returnData)
                revert(add(32, returnData), returnData_size)
            }
        } else {
            revert();
        }
    }

    function deposit(uint256[] calldata tokenIds, uint256 baseTokenAmount) public payable {

        if ((baseToken == address(0) && msg.value != baseTokenAmount) || (msg.value > 0 && baseToken != address(0))) {
            revert InvalidEthAmount();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            ERC721(nft).safeTransferFrom(msg.sender, address(this), tokenIds[i]);
        }

        if (baseToken != address(0)) {

            ERC20(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenAmount);
        }

        emit Deposit(tokenIds, baseTokenAmount);
    }

    function withdraw(address _nft, uint256[] calldata tokenIds, address token, uint256 tokenAmount) public onlyOwner {

        for (uint256 i = 0; i < tokenIds.length; i++) {
            ERC721(_nft).safeTransferFrom(address(this), msg.sender, tokenIds[i]);
        }

        if (token == address(0)) {

            msg.sender.safeTransferETH(tokenAmount);
        } else {

            ERC20(token).transfer(msg.sender, tokenAmount);
        }

        emit Withdraw(_nft, tokenIds, token, tokenAmount);
    }

    function setVirtualReserves(uint128 newVirtualBaseTokenReserves, uint128 newVirtualNftReserves) public onlyOwner {

        virtualBaseTokenReserves = newVirtualBaseTokenReserves;
        virtualNftReserves = newVirtualNftReserves;

        emit SetVirtualReserves(newVirtualBaseTokenReserves, newVirtualNftReserves);
    }

    function setMerkleRoot(bytes32 newMerkleRoot) public onlyOwner {

        merkleRoot = newMerkleRoot;

        emit SetMerkleRoot(newMerkleRoot);
    }

    function setFeeRate(uint16 newFeeRate) public onlyOwner {

        if (newFeeRate > 5_000) revert FeeRateTooHigh();

        feeRate = newFeeRate;

        emit SetFeeRate(newFeeRate);
    }

    function setUseStolenNftOracle(bool newUseStolenNftOracle) public onlyOwner {

        useStolenNftOracle = newUseStolenNftOracle;

        emit SetUseStolenNftOracle(newUseStolenNftOracle);
    }

    function setPayRoyalties(bool newPayRoyalties) public onlyOwner {

        payRoyalties = newPayRoyalties;

        emit SetPayRoyalties(newPayRoyalties);
    }

    function setAllParameters(
        uint128 newVirtualBaseTokenReserves,
        uint128 newVirtualNftReserves,
        bytes32 newMerkleRoot,
        uint16 newFeeRate,
        bool newUseStolenNftOracle,
        bool newPayRoyalties
    ) public {
        setVirtualReserves(newVirtualBaseTokenReserves, newVirtualNftReserves);
        setMerkleRoot(newMerkleRoot);
        setFeeRate(newFeeRate);
        setUseStolenNftOracle(newUseStolenNftOracle);
        setPayRoyalties(newPayRoyalties);
    }

    function flashLoan(IERC3156FlashBorrower receiver, address token, uint256 tokenId, bytes calldata data)
        external
        payable
        returns (bool)
    {

        if (!availableForFlashLoan(token, tokenId)) revert NotAvailableForFlashLoan();

        uint256 fee = flashFee(token, tokenId);

        if (baseToken == address(0) && msg.value < fee) revert InvalidEthAmount();

        ERC721(token).safeTransferFrom(address(this), address(receiver), tokenId);

        bool success =
            receiver.onFlashLoan(msg.sender, token, tokenId, fee, data) == keccak256("onFlashLoan");

        if (!success) revert FlashLoanFailed();

        ERC721(token).safeTransferFrom(address(receiver), address(this), tokenId);

        if (baseToken != address(0)) ERC20(baseToken).transferFrom(msg.sender, address(this), fee);

        return success;
    }

    function sumWeightsAndValidateProof(
        uint256[] memory tokenIds,
        uint256[] memory tokenWeights,
        MerkleMultiProof memory proof
    ) public view returns (uint256) {

        if (merkleRoot == bytes32(0)) {
            return tokenIds.length * 1e18;
        }

        uint256 sum;
        bytes32[] memory leafs = new bytes32[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {

            leafs[i] = keccak256(bytes.concat(keccak256(abi.encode(tokenIds[i], tokenWeights[i]))));

            sum += tokenWeights[i];
        }

        if (!MerkleProofLib.verifyMultiProof(proof.proof, merkleRoot, leafs, proof.flags)) {
            revert InvalidMerkleProof();
        }

        return sum;
    }

    function buyQuote(uint256 outputAmount)
        public
        view
        returns (uint256 netInputAmount, uint256 feeAmount, uint256 protocolFeeAmount)
    {

        uint256 inputAmount =
            FixedPointMathLib.mulDivUp(outputAmount, virtualBaseTokenReserves, (virtualNftReserves - outputAmount));

        protocolFeeAmount = inputAmount * Factory(factory).protocolFeeRate() / 10_000;
        feeAmount = inputAmount * feeRate / 10_000;
        netInputAmount = inputAmount + feeAmount + protocolFeeAmount;
    }

    function sellQuote(uint256 inputAmount)
        public
        view
        returns (uint256 netOutputAmount, uint256 feeAmount, uint256 protocolFeeAmount)
    {

        uint256 outputAmount = inputAmount * virtualBaseTokenReserves / (virtualNftReserves + inputAmount);

        protocolFeeAmount = outputAmount * Factory(factory).protocolFeeRate() / 10_000;
        feeAmount = outputAmount * feeRate / 10_000;
        netOutputAmount = outputAmount - feeAmount - protocolFeeAmount;
    }

    function changeFeeQuote(uint256 inputAmount) public view returns (uint256 feeAmount, uint256 protocolFeeAmount) {

        uint256 exponent = baseToken == address(0) ? 18 - 4 : ERC20(baseToken).decimals() - 4;
        uint256 feePerNft = changeFee * 10 ** exponent;

        feeAmount = inputAmount * feePerNft / 1e18;
        protocolFeeAmount = feeAmount * Factory(factory).protocolFeeRate() / 10_000;
    }

    function price() public view returns (uint256) {

        uint256 exponent = baseToken == address(0) ? 18 : (36 - ERC20(baseToken).decimals());
        return (virtualBaseTokenReserves * 10 ** exponent) / virtualNftReserves;
    }

    function flashFee(address, uint256) public view returns (uint256) {
        return changeFee;
    }

    function flashFeeToken() public view returns (address) {
        return baseToken;
    }

    function availableForFlashLoan(address token, uint256 tokenId) public view returns (bool) {

        try ERC721(token).ownerOf(tokenId) returns (address result) {
            return result == address(this);
        } catch {
            return false;
        }
    }

    function _getRoyalty(uint256 tokenId, uint256 salePrice)
        internal
        view
        returns (uint256 royaltyFee, address recipient)
    {

        address lookupAddress = IRoyaltyRegistry(royaltyRegistry).getRoyaltyLookupAddress(nft);

        if (IERC2981(lookupAddress).supportsInterface(type(IERC2981).interfaceId)) {

            (recipient, royaltyFee) = IERC2981(lookupAddress).royaltyInfo(tokenId, salePrice);

            if (royaltyFee > salePrice) revert InvalidRoyaltyFee();
        }
    }
}
