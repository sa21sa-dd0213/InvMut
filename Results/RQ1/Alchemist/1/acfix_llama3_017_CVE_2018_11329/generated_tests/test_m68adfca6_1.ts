import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m68adfca6 - CEO address mutation", function () {
  it("should kill mutant by checking fee transfer to original CEO address after sellDrugs", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    const seedAmount = ethers.parseEther("10");
    await instance.connect(addr1).seedMarket(1000, { value: seedAmount });

    // Get free kilos for addr1 so they can produce drugs
    await instance.connect(addr1).getFreeKilo();

    // Wait some time for drugs to accumulate
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Record balances before sell
    const originalCEOAddress = "0x85abE8E3bed0d4891ba201Af1e212FE50bb65a26";
    const ceoBalanceBefore = await ethers.provider.getBalance(originalCEOAddress);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const sellerBalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Perform sell
    const tx = await instance.connect(addr1).sellDrugs();
    const receipt = await tx.wait();

    // Get gas costs
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    // Check balances after sell
    const ceoBalanceAfter = await ethers.provider.getBalance(originalCEOAddress);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const sellerBalanceAfter = await ethers.provider.getBalance(addr1.address);

    // In original: fee goes to original CEO address
    // In mutant: fee goes to contract itself (address(this))
    // So if original CEO balance increased, it's the original contract
    // If original CEO balance unchanged but contract balance increased more than expected, it's the mutant
    const ceoBalanceDiff = ceoBalanceAfter - ceoBalanceBefore;
    const contractBalanceDiff = contractBalanceAfter - contractBalanceBefore;

    // The fee is 4% of the drug value (which is a fraction of the contract balance)
    // If the fee went to the original CEO, their balance increased
    // If the fee went to the contract, the contract balance increased by more than the seed amount
    expect(ceoBalanceDiff).to.be.gt(0, "Original CEO should have received fee in original contract");
  });
});