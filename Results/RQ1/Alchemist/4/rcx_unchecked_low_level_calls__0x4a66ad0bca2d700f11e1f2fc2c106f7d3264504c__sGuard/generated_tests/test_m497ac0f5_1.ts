import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m497ac0f5 test", function () {
  it("should return true on successful transfer call, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: two recipients and amounts
    const recipients = [addr1.address, addr2.address];
    const amounts = [1, 2]; // in ether units (will be multiplied by 1e18 internally)

    // Call transfer from the authorized address (owner in test, matches from address)
    const tx = await instance.connect(owner).transfer(recipients, amounts);
    const receipt = await tx.wait();

    // Check that the transaction succeeded and the return value was true
    // In ethers v6, we can decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address[] memory, uint[] memory) returns (bool)"]);
    const decodedResult = iface.decodeFunctionResult("transfer", receipt.logs[0].data);
    expect(decodedResult[0]).to.equal(true);
  });
});