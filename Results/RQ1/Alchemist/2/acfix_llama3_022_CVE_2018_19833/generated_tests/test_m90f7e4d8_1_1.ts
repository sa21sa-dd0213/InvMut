import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m90f7e4d8 - overflow check removal", function () {
  it("should revert when transferring to an address with max uint256 balance to prevent overflow", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply that allows enough tokens for testing
    const initialSupply = ethers.parseUnits("1000", 0); // decimals = 0
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // First, transfer a large amount to addr1 to set up the overflow condition
    // We'll send enough tokens so addr1's balance becomes very high
    const transferAmount = ethers.parseUnits("1000", 0);
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now set addr1's balance to max uint256 by minting (onlyOwner can mint)
    // We need to mint to addr1 to get it to max uint256
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await instance.balanceOf(addr1.address);
    const amountToMint = maxUint256 - currentBalance;
    
    // Mint tokens to addr1 to push balance to max uint256
    await instance.connect(owner).mintToken(addr1.address, amountToMint);
    
    // Verify addr1's balance is now max uint256
    expect(await instance.balanceOf(addr1.address)).to.equal(maxUint256);
    
    // Now try to transfer from addr1 to addr2 with any positive amount
    // This should revert because of the overflow check in the original contract
    // The mutant removes this check, so the transaction would succeed incorrectly
    await expect(
      instance.connect(addr1).transfer(addr2.address, 1)
    ).to.be.reverted;
  });
});