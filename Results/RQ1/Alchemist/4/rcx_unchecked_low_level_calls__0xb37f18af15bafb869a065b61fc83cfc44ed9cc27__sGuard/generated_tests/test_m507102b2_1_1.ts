import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert withdrawAll when called by non-owner (mutant m507102b2)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner tries to call withdrawAll - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // Empty revert reason since onlyOwner uses no custom message
  });
});