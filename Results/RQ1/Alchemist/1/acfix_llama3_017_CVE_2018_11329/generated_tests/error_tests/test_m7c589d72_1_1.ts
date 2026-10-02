import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m7c589d72 - devFee calculation on buyDrugs", function () {
  it("should detect mutant that adds 1 wei to msg.value when calculating devFee", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market first
    const seedAmount = ethers.parseEther("10");
    await instance.connect(addr1).seedMarket(1000, { value: seedAmount });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialCEOBalance = await ethers.provider.getBalance(owner.address);

    // addr2 buys drugs with exact amount
    const buyAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr2).buyDrugs({ value: buyAmount });
    const receipt = await tx.wait();

    // Calculate expected fee: 4% of msg.value (original) vs 4% of (msg.value + 1) (mutant)
    const expectedFeeOriginal = buyAmount * 4n / 100n;
    const expectedFeeMutant = (buyAmount + 1n) * 4n / 100n;

    // Get final balances
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const finalCEOBalance = await ethers.provider.getBalance(owner.address);

    // The CEO should have received exactly 4% of msg.value
    // If mutant is present, CEO received 4% of (msg.value + 1), which means extra 1 wei fee
    const ceoReceived = finalCEOBalance - initialCEOBalance;

    // The contract balance should decrease by exactly msg.value (sent to contract)
    // minus what was paid to CEO as fee
    // Original: contractBalance decrease = buyAmount - expectedFeeOriginal
    // Mutant: contractBalance decrease = buyAmount - expectedFeeMutant (extra 1 wei taken from contract)
    const contractBalanceChange = initialContractBalance - finalContractBalance;

    // For the original: contract should lose buyAmount - expectedFeeOriginal (rest goes to user as drugs)
    // For mutant: contract loses buyAmount - expectedFeeMutant (extra wei stolen from contract)

    // Assert that CEO received exactly 4% of buyAmount (not buyAmount + 1)
    expect(ceoReceived).to.equal(expectedFeeOriginal);

    // Also verify the contract balance changed correctly for original logic
    // Original: contract loses buyAmount - expectedFeeOriginal (since buyAmount sent in, expectedFeeOriginal paid to CEO)
    expect(contractBalanceChange).to.equal(buyAmount - expectedFeeOriginal);
  });
});