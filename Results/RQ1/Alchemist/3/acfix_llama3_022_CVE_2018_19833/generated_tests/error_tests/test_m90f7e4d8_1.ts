import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m90f7e4d8", function () {
  it("should revert when transferring to an address with balance near uint256 max", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(100, "Test", "TST");
    await instance.waitForDeployment();

    // First, mint a huge amount to addr1 to push its balance near max
    const maxUint256 = ethers.MaxUint256;
    const hugeAmount = maxUint256 - BigInt(1000);
    
    // Mint huge amount to addr1
    await instance.connect(owner).mintToken(addr1.address, hugeAmount);
    
    // Now try to transfer a small amount to addr1 - this should overflow and revert
    const smallAmount = ethers.parseEther("1");
    
    // addr1 sends some tokens to owner first to have a non-zero balance of its own
    await instance.connect(addr1).transfer(owner.address, BigInt(500));
    
    // Now owner tries to send tokens to addr1, which should cause overflow revert
    await expect(
      instance.connect(owner).transfer(addr1.address, smallAmount)
    ).to.be.reverted;
  });
});