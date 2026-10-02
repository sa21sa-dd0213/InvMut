import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m04673fd5 test", function () {
  it("should revert when sendMoney succeeds on original but fails on mutant due to true condition", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount,
    });

    // Prepare a successful call: send 0.5 ETH to recipient with empty data
    const sendValue = ethers.parseEther("0.5");
    const emptyData = "0x";

    // On the original contract, this call should succeed without revert
    // On the mutant, the if(true) causes revert even on success
    const tx = instance.connect(owner).sendMoney(
      await recipient.getAddress(),
      sendValue,
      emptyData
    );

    // Expect the transaction to NOT revert (original behavior)
    // The mutant will revert here, killing the mutant
    await expect(tx).to.not.be.reverted;
  });
});