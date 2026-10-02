import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to call withdrawAll after mutant removes require statement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdrawAll from non-owner address - should revert if onlyOwner works
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});