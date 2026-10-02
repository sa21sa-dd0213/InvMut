import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m811cc9b0 - withdraw balance check removed", function () {
  it("should revert when withdrawing more than balance on original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositTx = await instance.connect(addr1).deposit({ value: ethers.parseEther("1") });
    await depositTx.wait();

    // addr1 tries to withdraw 2 ether (more than their balance of 1 ether)
    // On the original contract, this should revert due to the require check.
    // On the mutant (where the check is removed), it will succeed.
    const withdrawTx = instance.connect(addr1).withdraw(ethers.parseEther("2"));

    // If the mutation is present, the call will succeed (no revert)
    // We expect a revert on the original, so this test kills the mutant by failing on the original behavior
    await expect(withdrawTx).to.be.reverted;
  });
});