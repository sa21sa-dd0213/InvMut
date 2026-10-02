import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea test", function () {
  it("should detect balance inflation by depositing and verifying final balance is zero after withdrawal", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(owner).deposit({ value: depositAmount });

    await instance.connect(owner).withdrawAll();

    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(0);
  });
});