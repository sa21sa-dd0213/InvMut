import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant mdbd4e99b", function () {
  it("should revert when withdrawing after a deposit due to credit balance mismatch", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw the full deposited amount
    // On the mutant, credit[addr1] will be depositAmount + 1 wei
    // The contract balance is only depositAmount, so the call will try to send more than available
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});