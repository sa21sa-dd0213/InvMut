import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - balance accounting", function () {
  it("should detect balance underflow when depositing and withdrawing full amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits 1 ETH
    const txDeposit = await instance.connect(user).deposit({ value: depositAmount });
    await txDeposit.wait();

    // User tries to withdraw all their credit (should be 1 ETH)
    // In the mutant, balance is undercounted by 1 wei, causing underflow
    await expect(
      instance.connect(user).withdrawAll()
    ).to.be.reverted;

    // Verify contract still holds the Ether
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(depositAmount);
  });
});