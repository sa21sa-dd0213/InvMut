import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should kill mutant mdc0823e5 by calling withdrawAll from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to allow withdrawal
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls withdrawAll - should succeed on original but fail on mutant
    // because mutant modifier requires msg.sender != owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.not.be.reverted;
  });
});