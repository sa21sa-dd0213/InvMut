import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect mutant that changes oCredit > 0 to true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of the contract
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // addr1 has zero credit (never deposited)
    await instance.connect(addr1).withdrawAll();

    // Check that balance remains unchanged (no withdrawal should have occurred)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});