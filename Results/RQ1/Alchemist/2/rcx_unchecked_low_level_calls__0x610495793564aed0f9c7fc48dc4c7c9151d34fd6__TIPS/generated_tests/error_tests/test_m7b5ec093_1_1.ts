import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m7b5ec093 (sendMoney revert condition)", function () {
  it("should revert when sendMoney to a failing contract but mutant does not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy SimpleWallet (no constructor arguments needed)
    const SimpleWallet = await ethers.getContractFactory("SimpleWallet");
    const wallet = await SimpleWallet.deploy();
    await wallet.waitForDeployment();

    // Deploy a simple contract that rejects ether (no payable fallback)
    const Rejector = await ethers.getContractFactory("SimpleWallet"); // reuse same bytecode
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialBalance = await ethers.provider.getBalance(await wallet.getAddress());

    // Attempt to sendMoney to the rejector - should revert on original, but NOT on mutant
    // The rejector's fallback is not payable (since SimpleWallet's fallback IS payable, we need a non-payable contract)
    // Actually let's use a contract with a non-payable fallback or that reverts
    const NonPayableFactory = await ethers.getContractFactory("NonPayableContract");
    const nonPayable = await NonPayableFactory.deploy();
    await nonPayable.waitForDeployment();

    // This call should revert on original because call fails and !_s triggers revert
    // On mutant, the false condition means it does NOT revert, so the ether is lost
    await expect(
      wallet.sendMoney(
        await nonPayable.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted; // Original reverts, mutant passes - test kills mutant

    // Verify balance unchanged on original (mutant would have lost ether)
    const finalBalance = await ethers.provider.getBalance(await wallet.getAddress());
    expect(finalBalance).to.equal(initialBalance); // Should hold on original, fail on mutant
  });

  // Deploy a helper contract that has a non-payable fallback (reverts)
  beforeEach(async function () {
    // Deploy a simple contract that rejects ether
    const NonPayableFactory = await ethers.getContractFactory("NonPayableRejector");
    if (!NonPayableFactory) {
      // Create it inline
      const code = "6080604052348015600f57600080fd5b5060848061001e6000396000f3fe6080604052600080fdfea2646970667358221220";
      // Just use a simple account with no code as target - call will always fail
    }
  });
});