import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airPort mutant m5771dd21 test", function () {
  it("should detect mutation of keccak256 to sha256 by reverting on valid transferFrom call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like contract that has transferFrom function
    const ERC20Mock = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Mock.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to addr1 and approve airPort contract to transfer
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));
    
    // Deploy airPort contract (no constructor args needed)
    const airPortFactory = await ethers.getContractFactory("airPort");
    const airPort = await airPortFactory.deploy();
    await airPort.waitForDeployment();
    
    // Transfer tokens from addr1 to addr2 via airPort.transfer
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");
    
    // This should revert on the mutant because sha256 produces wrong function selector
    await expect(
      airPort.transfer(addr1.address, token.target, recipients, amount)
    ).to.be.reverted;
    
    // On original contract this would succeed, but mutant fails
    // Verify no tokens were transferred
    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(0);
  });
});