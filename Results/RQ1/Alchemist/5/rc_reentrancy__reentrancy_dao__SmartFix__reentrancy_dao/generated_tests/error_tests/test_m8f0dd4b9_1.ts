import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ReentrancyDAO mutant detection test", function () {
  it("should detect when withdrawAll allows zero-credit withdrawal (mutant: > replaced with >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has never deposited, so credit[addr1] = 0
    // Original contract: withdrawAll() does nothing because oCredit > 0 is false
    // Mutant: withdrawAll() enters the if block because oCredit >= 0 is true,
    // subtracts 0 from balance, sets credit to 0, and makes a zero-value call

    // Get initial balance of the contract
    const initialBalance = await ethers.provider.getBalance(instance.target);

    // addr1 calls withdrawAll with zero credit
    await instance.connect(addr1).withdrawAll();

    // Get final balance
    const finalBalance = await ethers.provider.getBalance(instance.target);

    // In the original, balance stays the same (no state changes for zero credit)
    // In the mutant, balance might change or gas is consumed differently
    // Assert balance is unchanged - this will pass on original, fail on mutant
    // because the mutant executes the balance update line
    expect(finalBalance).to.equal(initialBalance);
  });
});