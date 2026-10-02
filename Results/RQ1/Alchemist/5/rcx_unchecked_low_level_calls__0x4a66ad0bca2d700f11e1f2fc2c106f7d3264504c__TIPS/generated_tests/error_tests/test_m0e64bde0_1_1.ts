import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m0e64bde0 test", function () {
  it("should kill mutant by verifying transfer loop executes when _tos has elements", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy EBU - no constructor arguments needed as per contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the contract addresses
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();

    // Fund the from address with ETH so it can make calls (or use impersonation)
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Prepare test data: one recipient, one value
    const recipients = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 inside contract)

    // Call transfer from the authorized address (from)
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress]
    });
    const fromSigner = await ethers.getSigner(fromAddress);

    // Fund the fromSigner for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Execute transfer
    const tx = await instance.connect(fromSigner).transfer(recipients, values);
    await tx.wait();

    // The original contract would make the transferFrom call.
    // The mutant with i > _tos.length would skip the loop entirely.
    // We can verify by checking that the call was made (e.g., via event or balance check)
    // Since we cannot easily check the internal call, we can verify the function succeeded
    // and that it didn't revert - but the mutant would also not revert.
    // A better approach: check that the function returns true (original) vs 
    // we can observe that the loop never executes by checking that 
    // the contract's from address still has its ETH (no gas spent on internal calls)
    // Actually, we can check the return value - both return true.

    // The key difference: mutant loop never executes, so we need to verify 
    // that the internal call was made. We can do this by checking the 
    // recipient's ETH balance change (if transferFrom sends ETH) or
    // by checking that the call reverted for invalid input vs not.

    // Better: use a second call with invalid recipient to force revert in original
    // but mutant would succeed (no loop execution = no revert)
    const badRecipients = [ethers.ZeroAddress]; // address(0) will cause revert in transferFrom
    const badValues = [1];

    // Original should revert because transferFrom to zero address fails
    await expect(
      instance.connect(fromSigner).transfer(badRecipients, badValues)
    ).to.be.reverted;

    // If the mutant is live, the loop doesn't execute, so no revert occurs
    // Therefore a test expecting revert will FAIL on the mutant -> kills it

    // Stop impersonation
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [fromAddress]
    });
  });
});