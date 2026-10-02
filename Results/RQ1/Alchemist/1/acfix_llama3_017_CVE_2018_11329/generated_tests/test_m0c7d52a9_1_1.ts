import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m0c7d52a9 - collectDrugs self-referral", function () {
  it("should detect the mutant by verifying self-referral is not accepted", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Give addr1 some free kilos first
    await instance.connect(addr1).getFreeKilo();

    // Record addr1's initial claimedDrugs balance
    const initialClaimed = await instance.claimedDrugs(addr1.address);

    // Collect some drugs to have something to work with
    // We need to wait some time so drugs accumulate
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Now collect drugs with addr1 referring themselves (self-referral attempt)
    const tx = await instance.connect(addr1).collectDrugs(addr1.address);
    await tx.wait();

    // Get final claimedDrugs balance for addr1
    const finalClaimed = await instance.claimedDrugs(addr1.address);

    // If the mutant is present, self-referral might succeed and add 20% bonus
    // In the original, self-referral is blocked, so no bonus is added
    // The drugs used by addr1 should be non-zero after waiting
    const drugsUsed = await instance.getMyDrugs();

    // Calculate what the claimedDrugs would be with a successful self-referral bonus
    // The bonus is drugsUsed / 5 (20% of drugs used)
    const expectedBonus = drugsUsed / 5n;

    // In the original, self-referral is rejected, so claimedDrugs should only have
    // the drugs from time passing (which get reset to 0 after collectDrugs)
    // Actually after collectDrugs, claimedDrugs[msg.sender] is set to 0
    // So finalClaimed should be 0 if self-referral was rejected

    // If mutant allows self-referral, claimedDrugs would have the referral bonus
    // The bonus goes to referrals[msg.sender] which would be addr1 themselves
    expect(finalClaimed).to.equal(0, "Self-referral should not be accepted - claimedDrugs should be 0 after collectDrugs");
  });
});