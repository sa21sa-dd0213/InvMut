import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m7c589d72 detection", function () {
  it("should detect the mutant by verifying devFee calculation in buyDrugs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    const seedAmount = ethers.parseEther("1");
    await instance.connect(owner).seedMarket(1000, { value: seedAmount });

    // Record balances before buyDrugs
    const ceoBalanceBefore = await ethers.provider.getBalance(owner.address);
    const userDrugsBefore = await instance.connect(addr1).getMyDrugs();

    // Send a specific ETH amount to buyDrugs
    const buyAmount = ethers.parseEther("10");
    const tx = await instance.connect(addr1).buyDrugs({ value: buyAmount });
    const receipt = await tx.wait();

    // Calculate expected dev fee: 4% of msg.value (the original behavior)
    const expectedFee = (buyAmount * 4n) / 100n;

    // Check CEO balance increased by exactly 4% of msg.value
    const ceoBalanceAfter = await ethers.provider.getBalance(owner.address);
    const ceoIncrease = ceoBalanceAfter - ceoBalanceBefore;
    expect(ceoIncrease).to.equal(expectedFee);

    // Check user's claimed drugs calculation
    // drugsBought = calculateDrugBuy(msg.value, contractBalance - msg.value) - devFee(drugsBought)
    const contractBalance = await ethers.provider.getBalance(instance.target);
    const drugsBought = await instance.connect(addr1).calculateDrugBuy(buyAmount, contractBalance - buyAmount);
    const expectedDrugs = drugsBought - (drugsBought * 4n) / 100n;
    const userDrugsAfter = await instance.connect(addr1).getMyDrugs();
    const userDrugsIncrease = userDrugsAfter - userDrugsBefore;
    expect(userDrugsIncrease).to.equal(expectedDrugs);
  });
});