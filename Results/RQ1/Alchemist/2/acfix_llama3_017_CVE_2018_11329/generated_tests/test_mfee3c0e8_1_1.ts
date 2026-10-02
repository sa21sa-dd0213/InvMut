import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant mfee3c0e8 test", function () {
  it("should kill the mutant by verifying getBalance returns correct contract balance after ETH transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market to initialize the contract
    await instance.seedMarket(1000, { value: ethers.parseEther("1") });

    // Record initial balance
    const initialBalance = await instance.getBalance();

    // Send ETH to the contract via buyDrugs
    const buyAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).buyDrugs({ value: buyAmount });

    // Get the contract balance after the transaction
    const finalBalance = await instance.getBalance();

    // The balance should have increased by the buyAmount (minus fees that went to CEO)
    // CEO fee is 4% of msg.value, so contract should retain 96%
    const expectedBalance = initialBalance + (buyAmount * 96n / 100n);

    // If mutant removed return statement, getBalance will return 0
    // This assertion will pass on original but fail on mutant
    expect(finalBalance).to.equal(expectedBalance);
  });
});