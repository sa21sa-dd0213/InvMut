import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m7f29b1b2 - buyDrugs msg.value-1", function () {
  it("should kill mutant by verifying correct claimedDrugs after buying with exact ether amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first (required for buyDrugs)
    await instance.seedMarket(1000, { value: ethers.parseEther("10") });

    // User buys drugs with exactly 1 ether
    const buyAmount = ethers.parseEther("1");
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Calculate expected drugs using original formula: calculateDrugBuy(msg.value, contractBalance - msg.value)
    const expectedDrugs = await instance.calculateDrugBuy(
      buyAmount,
      contractBalanceBefore - buyAmount
    );
    // Apply dev fee (4%) to get actual claimedDrugs
    const fee = await instance.devFee(expectedDrugs);
    const expectedClaimed = expectedDrugs - fee;

    // Execute buyDrugs
    const tx = await instance.connect(user).buyDrugs({ value: buyAmount });
    await tx.wait();

    // Check claimedDrugs - mutant will use msg.value-1 in calculateDrugBuy, producing fewer drugs
    const actualClaimed = await instance.claimedDrugs(user.address);

    // If mutant is present, actualClaimed will be less than expectedClaimed
    // because it calculated using 1 wei less, resulting in fewer drugs
    expect(actualClaimed).to.equal(expectedClaimed);
  });
});