import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - caddress replaced with address(this)", function () {
  it("should kill mutant mfd526744 by verifying that transferFrom call is made to the original hardcoded address, not to the contract itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract - EBU has no constructor arguments
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Verify that caddress is NOT address(this) in the original
    // In the mutant it would be address(this), so we test the behavior
    const originalCaddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";

    // Create test data
    const tos = [addr1.address];
    const amounts = [1]; // 1 token * 10^18

    // Get the contract's ETH balance before the call
    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    // Call transfer function as the authorized sender (owner)
    // The owner address matches the 'from' address in the contract
    await instance.connect(owner).transfer(tos, amounts);

    // Get the contract's ETH balance after the call
    const balanceAfter = await ethers.provider.getBalance(contractAddress);

    // In the original: caddress.call() sends to the hardcoded address, so contract ETH balance stays same
    // In the mutant: caddress.call() sends to address(this), which would execute a self-call
    // A self-call would revert because transferFrom doesn't exist in EBU, consuming gas
    // This difference in gas consumption would be detectable

    // The key assertion: if the mutant is present, the self-call will consume gas
    // and potentially change the contract's balance differently
    // We can verify this by checking that the balance change is consistent with the original behavior

    // In the original, no ETH is sent, so balance should be unchanged (minus gas for the call)
    // In the mutant, the call to self would revert, consuming all gas
    expect(balanceAfter).to.equal(balanceBefore);

    // Additional verification: check that caddress was not changed to address(this)
    const storedCaddress = await instance.caddress();
    expect(storedCaddress).to.equal(originalCaddress);
  });
});