import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - sendMoney failure detection", function () {
  it("should revert when sendMoney is called with a target that rejects Ether, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that rejects incoming Ether (no receive/fallback)
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the wallet with some Ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send Ether to the rejector contract - should revert on original, succeed on mutant
    const tx = instance.connect(owner).sendMoney(
      await rejector.getAddress(),
      ethers.parseEther("0.5")
    );

    // This assertion will fail on the mutant because the call succeeds (no revert)
    await expect(tx).to.be.reverted;
  });
});

// Helper contract that rejects Ether
contract Rejector {
  // No receive() or fallback() - will reject incoming Ether
}