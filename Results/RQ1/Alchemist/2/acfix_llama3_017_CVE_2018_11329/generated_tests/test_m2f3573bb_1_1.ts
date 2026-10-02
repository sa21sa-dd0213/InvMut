import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - m2f3573bb", function () {
    it("should detect mutant where || replaces && in collectDrugs referral check", async function () {
        const [owner, userA, userB] = await ethers.getSigners();
        
        // Deploy the contract
        const Factory = await ethers.getContractFactory("EtherCartel");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Seed the market to initialize the contract
        await instance.seedMarket(1000, { value: ethers.parseEther("1") });
        
        // UserA gets free kilos first
        await instance.connect(userA).getFreeKilo();
        
        // UserA calls collectDrugs with userB as referral
        await instance.connect(userA).collectDrugs(userB.address);
        
        // Record the referral mapping for userA
        const referralAfterFirstCall = await instance.referrals(userA.address);
        expect(referralAfterFirstCall).to.equal(userB.address);
        
        // UserA calls collectDrugs again, this time trying to refer themselves
        await instance.connect(userA).collectDrugs(userA.address);
        
        // Get the referral mapping after the second call
        const referralAfterSecondCall = await instance.referrals(userA.address);
        
        // In the original contract (with &&), the referral should remain userB
        // In the mutant (with ||), the referral would be overwritten to userA
        // If the referral equals userA, the mutant is detected (killed)
        // If the referral still equals userB, the original behavior is preserved
        expect(referralAfterSecondCall).to.equal(userB.address, 
            "Mutant detected: referral was overwritten to self, indicating || replaced &&");
    });
});