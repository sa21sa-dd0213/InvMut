import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - mb692ee2a", function () {
  it("should reject self-referral in collectDrugs (mutant allows self-referral, original does not)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize the contract
    await instance.seedMarket(100, { value: ethers.parseEther("10") });

    // Give addr1 some starting kilos via getFreeKilo
    await instance.connect(addr1).getFreeKilo();

    // Simulate time passing to accumulate drugs
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");

    // Get initial claimedDrugs for addr1
    const initialClaimed = await instance.claimedDrugs(addr1.address);

    // Attempt self-referral by passing addr1's own address as ref
    await instance.connect(addr1).collectDrugs(addr1.address);

    // Get claimedDrugs after collectDrugs
    const finalClaimed = await instance.claimedDrugs(addr1.address);

    // In the original contract, self-referral should not add referral bonus (drugsUsed/5)
    // The only increase should come from resetting claimedDrugs and adding new kilos,
    // but the claimedDrugs mapping for the sender should be 0 after collectDrugs
    // In the mutant, the referral bonus would be added to claimedDrugs[addr1]
    // So if claimedDrugs[addr1] > 0, the mutant is detected
    expect(finalClaimed).to.equal(0);
  });
});