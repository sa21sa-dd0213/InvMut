import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m61dcc4f5 by detecting incorrect function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token for testing
    const TokenFactory = await ethers.getContractFactory("TestERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Fund addr1 with tokens and approve the airdrop contract
    const amount = ethers.parseEther("10");
    await token.transfer(addr1.address, amount);
    await token.connect(addr1).approve(owner.address, amount);
    
    // Deploy the airdrop contract (no constructor arguments needed)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();
    
    // Prepare recipients array
    const recipients = [addr2.address];
    
    // The original contract would succeed because keccak256 produces correct selector
    // The mutant uses sha256 which produces wrong selector, causing revert
    await expect(
      airdrop.transfer(addr1.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});

// Helper ERC20 token contract for testing
contract TestERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor() {
        balanceOf[msg.sender] = ethers.parseEther("1000");
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
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
    
    function getAddress() public view returns (address) {
        return address(this);
    }
}