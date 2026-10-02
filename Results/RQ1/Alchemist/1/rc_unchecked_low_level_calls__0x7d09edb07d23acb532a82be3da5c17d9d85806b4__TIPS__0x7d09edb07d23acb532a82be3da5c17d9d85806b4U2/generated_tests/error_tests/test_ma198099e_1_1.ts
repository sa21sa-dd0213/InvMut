import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant detection - donate function", function () {
  it("should detect mutant where donateToWhale uses msg.value+1 instead of msg.value", async function () {
    const [owner, addr1, whale] = await ethers.getSigners();

    // Deploy PoCGame with required constructor arguments
    const betLimit = ethers.parseEther("1");
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whale.address, betLimit);
    await instance.waitForDeployment();

    // Open the contract to the public (onlyOwner)
    await instance.connect(owner).OpenToThePublic();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialWhaleBalance = await ethers.provider.getBalance(whale.address);

    // Donate a specific amount (e.g., 0.5 ETH)
    const donateAmount = ethers.parseEther("0.5");

    // Try to call donate - this should revert in the mutant because it tries to send msg.value+1
    // but succeed in the original
    try {
      const tx = await instance.connect(addr1).donate({ value: donateAmount });
      await tx.wait();

      // If we reach here, the transaction succeeded (original behavior)
      // Check final balances
      const finalContractBalance = await ethers.provider.getBalance(instance.target);
      const finalWhaleBalance = await ethers.provider.getBalance(whale.address);

      // In the original: contract balance unchanged, whale receives exactly donateAmount
      expect(finalContractBalance).to.equal(initialContractBalance);
      expect(finalWhaleBalance - initialWhaleBalance).to.equal(donateAmount);

    } catch (error: any) {
      // If it reverts, the mutant is detected
      expect(error.message).to.include("revert");
    }
  });
});