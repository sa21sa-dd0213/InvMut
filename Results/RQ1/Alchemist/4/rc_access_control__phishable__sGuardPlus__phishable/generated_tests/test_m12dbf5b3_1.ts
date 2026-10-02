import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test", function () {
  it("should kill mutant m12dbf5b3 by verifying owner is correctly set from constructor argument", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract so withdrawAll can transfer it
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Attempt to withdrawAll from the owner address - this should succeed
    // on the original contract but fail on the mutant (where owner is address(0))
    const withdrawTx = instance.connect(owner).withdrawAll(owner.address);
    await expect(withdrawTx).to.not.be.reverted;
  });
});