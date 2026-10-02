import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m3dd4bb80 test", function () {
  it("should detect mutant that adds 1 to msg.value in deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User deposits exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(user).deposit({ value: depositAmount });

    // Attempt to withdraw all funds - in the original contract, this should succeed
    // In the mutant, the credit will be depositAmount + 1 wei, causing the withdrawal
    // to try to send more ether than the contract holds, which should revert
    const withdrawTx = instance.connect(user).withdrawAll();

    // The mutant will fail because it tries to send 2 wei but contract only has 1 wei
    await expect(withdrawTx).to.be.reverted;

    // Additionally, verify the contract balance is as expected for original
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(depositAmount);
  });
});