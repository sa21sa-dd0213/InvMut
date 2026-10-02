import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney fails (original) but mutant allows silent failure", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that will reject incoming ether (no receive/fallback)
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    const initialBalance = await ethers.provider.getBalance(instance.target);

    // Attempt to send 1 ether to the rejector contract
    const tx = instance.connect(owner).sendMoney(
      rejector.target,
      ethers.parseEther("1"),
      "0x"
    );

    // The original should revert; the mutant will not revert
    // We check that the balance remains unchanged (mutant would spend gas but not transfer)
    await expect(tx).to.be.reverted;

    // After revert, balance should be unchanged
    const finalBalance = await ethers.provider.getBalance(instance.target);
    expect(finalBalance).to.equal(initialBalance);
  });
});

// Helper contract that rejects all ether (no receive/fallback)
contract Rejector {
  // Intentionally empty - no receive() or fallback()
}