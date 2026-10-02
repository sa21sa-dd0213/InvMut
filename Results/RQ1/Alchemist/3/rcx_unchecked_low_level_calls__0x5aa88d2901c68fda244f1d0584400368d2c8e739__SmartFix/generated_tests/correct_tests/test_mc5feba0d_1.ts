import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant mc5feba0d", function () {
  it("should allow owner to call Command and not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ETH to the contract so it has balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call Command from owner - should succeed on original, revert on mutant
    const tx = instance.connect(owner).Command(
      addr1.address,
      ethers.toUtf8Bytes("")
    );
    
    // On original contract this succeeds; on mutant it reverts
    await expect(tx).to.not.be.reverted;
  });
});