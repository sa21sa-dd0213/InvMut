import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m0583e5c5", function () {
  it("should revert when calling transfer due to incorrect function selector from sha256", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: give addr1 some tokens and approve the EBU contract to spend them
    const amount = ethers.parseEther("10");
    await token.transfer(addr1.address, amount);
    await token.connect(addr1).approve(await instance.getAddress(), amount);
    
    // Call transfer which will internally try to call transferFrom with sha256 selector
    // The sha256 hash will produce a different bytes4 selector than the correct keccak256 one,
    // causing the internal call to fail and revert
    const recipients = [addr2.address];
    const amounts = [amount];
    
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        await token.getAddress(),
        recipients,
        amounts
      )
    ).to.be.reverted;
  });
});

// Helper ERC20 contract for testing
contract TestERC20 {
    string public name = "Test Token";
    string public symbol = "TST";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor() {
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