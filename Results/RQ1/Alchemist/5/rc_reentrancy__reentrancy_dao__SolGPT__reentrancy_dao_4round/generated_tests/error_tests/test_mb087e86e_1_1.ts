import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should detect balance underflow by depositing and withdrawing full amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).deposit({ value: depositAmount });

    // User withdraws all
    await instance.connect(user).withdrawAll();

    // Check that contract ether balance is zero (should fail on mutant)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});