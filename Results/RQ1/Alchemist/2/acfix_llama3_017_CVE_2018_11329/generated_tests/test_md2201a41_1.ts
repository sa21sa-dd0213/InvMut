import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant md2201a41 - buyDrugs msg.value+1", function () {
  it("should detect mutant by comparing actual drugs received vs expected drugs for sent ETH", async function () {
    const [owner, buyer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first to initialize
    const seedDrugs = ethers.parseEther("100");
    await instance.connect(owner).seedMarket(seedDrugs, { value: ethers.parseEther("10") });

    // Buyer gets some kilos first to earn drugs over time
    await instance.connect(buyer).getFreeKilo();

    // Wait some time to accumulate drugs
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Collect drugs to get claimedDrugs balance
    await instance.connect(buyer).collectDrugs(ethers.ZeroAddress);

    // Now test buyDrugs: send exactly 1 ether
    const sendAmount = ethers.parseEther("1");
    
    // Get expected drugs for this exact amount using calculateDrugBuySimple
    const expectedDrugs = await instance.calculateDrugBuySimple(sendAmount);
    
    // Get contract balance before purchase
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Execute buyDrugs with exactly 1 ether
    const tx = await instance.connect(buyer).buyDrugs({ value: sendAmount });
    await tx.wait();

    // Get actual drugs received (claimedDrugs increased by drugsBought)
    const actualDrugs = await instance.claimedDrugs(buyer.address);

    // Calculate what drugs should have been received (subtract devFee)
    const devFeeAmount = await instance.devFee(expectedDrugs);
    const expectedAfterFee = expectedDrugs - devFeeAmount;

    // The mutant adds 1 wei to msg.value in calculateDrugBuy, giving more drugs
    // So actual drugs should be > expected after fee (kills mutant)
    expect(actualDrugs).to.be.gt(expectedAfterFee);
  });
});