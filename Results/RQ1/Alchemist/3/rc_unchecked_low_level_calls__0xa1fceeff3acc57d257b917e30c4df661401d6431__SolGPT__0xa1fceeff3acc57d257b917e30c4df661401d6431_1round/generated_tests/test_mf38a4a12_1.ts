import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - mf38a4a12", function () {
  it("should revert when calling transfer with valid inputs and expecting true return value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that supports transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare arrays for transfer
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20")];

    // Call transfer and expect the return value to be true (original behavior)
    const tx = await instance.transfer(await token.getAddress(), tos, vs);
    const receipt = await tx.wait();

    // The mutant removes 'return true;', so the function returns false
    // We assert that the transaction succeeds (no revert) but the return value should be true
    // Since the mutant returns false, this assertion should fail on the mutant
    const result = await instance.callStatic.transfer(await token.getAddress(), tos, vs);
    expect(result).to.equal(true);
  });
});

// Helper ERC20 token for testing
contract TestERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowance[from][msg.sender] >= amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}