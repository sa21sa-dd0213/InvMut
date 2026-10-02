import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - overflow check removal", function () {
  it("should revert when transferring tokens that would cause overflow on recipient balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply that allows us to set up overflow scenario
    const initialSupply = ethers.parseEther("1000"); // 1000 tokens (0 decimals)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TT");
    await instance.waitForDeployment();

    // First, give addr1 a huge balance to test overflow on receiving end
    // We need to mint enough tokens so that addr2's balance + value can overflow uint256
    const maxUint256 = ethers.MaxUint256;
    
    // Mint almost max uint256 to addr2 (the recipient)
    // We'll mint maxUint256 - 1 to addr2, then try to transfer 2 more tokens to cause overflow
    const amountToMint = maxUint256 - 1n;
    await instance.connect(owner).mintToken(addr2.address, amountToMint);
    
    // Now give addr1 some tokens to transfer
    const transferAmount = 2n;
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Attempt to transfer from addr1 to addr2 - should overflow and revert in original
    await expect(
      instance.connect(addr1).transfer(addr2.address, transferAmount)
    ).to.be.reverted;
  });
});