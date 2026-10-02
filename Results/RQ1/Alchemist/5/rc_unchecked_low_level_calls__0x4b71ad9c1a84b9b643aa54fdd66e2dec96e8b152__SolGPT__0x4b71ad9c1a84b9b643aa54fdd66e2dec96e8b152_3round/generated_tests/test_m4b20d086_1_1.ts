import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 test", function () {
  it("should detect loop condition mutation by verifying transferFrom is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy the airPort contract (no constructor arguments needed)
    const AirPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await AirPortFactory.deploy();
    await airPort.waitForDeployment();

    // Setup: owner approves airPort to transfer tokens
    const amount = ethers.parseEther("10");
    await token.approve(await airPort.getAddress(), amount);

    // Owner transfers tokens to addr1 first so transferFrom has something to pull
    await token.transfer(addr1.address, amount);

    // addr1 approves airPort to transfer their tokens
    await token.connect(addr1).approve(await airPort.getAddress(), amount);

    // Get initial balance of addr2
    const initialBalance = await token.balanceOf(addr2.address);

    // Call transfer on airPort - this should trigger transferFrom from addr1 to addr2
    const recipients = [addr2.address];
    const tx = await airPort.transfer(addr1.address, await token.getAddress(), recipients, amount);
    await tx.wait();

    // Assert: In the original contract, addr2 would receive tokens.
    // In the mutant, the loop never executes, so addr2's balance should remain unchanged.
    const finalBalance = await token.balanceOf(addr2.address);
    expect(finalBalance).to.equal(initialBalance + amount);
  });
});

// Helper contract for testing - simple ERC20
contract TestERC20 {
    string public name = "TestToken";
    string public symbol = "TST";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {
        totalSupply = ethers.parseEther("1000000");
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value);
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value);
        require(allowance[from][msg.sender] >= value);
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        return true;
    }
}