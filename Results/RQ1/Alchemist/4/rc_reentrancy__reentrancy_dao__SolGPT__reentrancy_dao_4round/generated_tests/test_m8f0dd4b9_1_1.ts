import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant by calling withdrawAll() with zero credit balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has never deposited, so credit[addr1] = 0
    // In the original contract, oCredit > 0 would be false, so nothing happens
    // In the mutant, oCredit >= 0 is true, so it will attempt to execute the withdrawal logic
    const tx = await instance.connect(addr1).withdrawAll();

    // The transaction should succeed (not revert) on the mutant
    // but should have no effect on the original
    await expect(tx).to.not.be.reverted;

    // Verify that balance remains unchanged (should still be 0)
    expect(await instance.balance()).to.equal(0);
  });
});