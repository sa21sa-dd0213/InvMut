import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m7f172e33 test", function () {
  it("should detect mutant that changes >= to > in _transfer require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";
    
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();
    
    // Transfer exact balance of addr1 (0 tokens) to addr2 - should revert due to insufficient balance
    // Then transfer owner's full balance to addr1 - should succeed on original but fail on mutant
    const ownerBalance = await instance.balanceOf(owner.address);
    
    // Attempt to transfer exactly the owner's full balance
    await expect(
      instance.connect(owner).transfer(addr1.address, ownerBalance)
    ).to.not.be.reverted;
    
    // Verify owner's balance became 0
    expect(await instance.balanceOf(owner.address)).to.equal(0);
    // Verify addr1 received the full amount
    expect(await instance.balanceOf(addr1.address)).to.equal(ownerBalance);
  });
});