import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m2aa136d2", function () {
  it("should prevent user from referring themselves in collectDrugs", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // Give user some starting kilos via getFreeKilo
    await instance.connect(user).getFreeKilo();

    // Wait some time so user accumulates drugs
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // User tries to refer themselves - should NOT set referral mapping
    const tx = instance.connect(user).collectDrugs(user.address);
    
    // In the original contract, this would succeed but NOT set the referral
    // In the mutant (true), it would incorrectly set the referral to themselves
    await expect(tx).to.not.be.reverted;

    // Check that the referral was NOT set to themselves
    // We can verify by checking if the user gets the 20% bonus on next collect
    const initialClaimed = await instance.claimedDrugs(user.address);
    
    // Collect drugs again to see if referral bonus was applied
    await instance.connect(user).collectDrugs(ethers.ZeroAddress);
    const finalClaimed = await instance.claimedDrugs(user.address);
    
    // The difference should be exactly the drugs produced since last collect
    // If referral was set to self, there would be an extra 20% bonus
    const kilos = await instance.getMyKilo();
    const drugsSinceLast = await instance.getDrugsSinceLastCollect(user.address);
    const expectedNewClaimed = drugsSinceLast; // No referral bonus expected
    
    // If referral was set to self, claimed would include 20% bonus = drugsSinceLast * 1.2
    expect(finalClaimed - initialClaimed).to.be.lessThanOrEqual(expectedNewClaimed);
    
    // Additional check: verify the referral mapping is still address(0)
    const referral = await instance.referrals(user.address);
    expect(referral).to.equal(ethers.ZeroAddress);
  });
});