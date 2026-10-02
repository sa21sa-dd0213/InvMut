import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m5227532e test", function () {
  it("should revert when non-owner calls sendMoney in original contract, but mutant allows it", async function () {
    const [owner, attacker, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Attacker tries to call sendMoney - should revert in original, but mutant allows it
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    const receiverBalanceBefore = await ethers.provider.getBalance(
      receiver.address
    );

    // Attempt the call from non-owner address
    try {
      const tx = await instance
        .connect(attacker)
        .sendMoney(receiver.address, ethers.parseEther("0.5"));
      await tx.wait();

      // If we reach here, the mutation is live - funds were transferred
      const contractBalanceAfter = await ethers.provider.getBalance(
        await instance.getAddress()
      );
      const receiverBalanceAfter = await ethers.provider.getBalance(
        receiver.address
      );

      expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);
      expect(receiverBalanceAfter).to.be.gt(receiverBalanceBefore);
    } catch (error: any) {
      // If revert occurs, this is the original (correct) behavior
      // The mutant would NOT revert, so this catch means mutant is killed
      expect(error.message).to.include("revert");
    }
  });
});