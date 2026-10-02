import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - m363d76ba", function () {
  it("should kill the mutant by sending non-zero msg.value when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH from owner
    const initialFunding = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Verify contract has balance
    let contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(initialFunding);

    // Prepare a non-zero msg.value for the multiplicate call
    const sendValue = ethers.parseEther("5");
    const recipient = addr1.address;

    // Get recipient balance before
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient);

    // Call multiplicate - original would succeed, mutant should revert
    await expect(
      instance.connect(owner).multiplicate(recipient, { value: sendValue })
    ).to.be.reverted;

    // Verify no transfer happened (mutant reverted)
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient);
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);
  });
});