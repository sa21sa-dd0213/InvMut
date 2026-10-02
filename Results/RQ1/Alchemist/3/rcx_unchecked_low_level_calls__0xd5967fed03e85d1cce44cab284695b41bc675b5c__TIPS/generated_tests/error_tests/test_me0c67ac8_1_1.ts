import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant me0c67ac8 test", function () {
  it("should kill mutant by asserting return value is true after successful transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract doesn't have any constructor arguments based on the provided code
    // Transfer 1 wei from owner to addr1 and addr2 using the transfer function
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("0.001");

    // Call the transfer function and capture the return value
    const tx = await instance.transfer(owner.address, instance.target, recipients, value);
    const receipt = await tx.wait();

    // Check that the transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);

    // For the original contract, transfer returns true on success.
    // The mutant removes the return true statement, so it returns false by default.
    // We decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256) returns (bool)"]);
    const decodedReturn = iface.decodeFunctionResult("transfer", tx.data);

    // In ethers v6, we need to get the return value differently
    // The transaction receipt doesn't directly expose return values
    // Instead, we can make a static call to verify the behavior
    const result = await instance.transfer.staticCall(owner.address, instance.target, recipients, value);
    expect(result).to.equal(true);
  });
});