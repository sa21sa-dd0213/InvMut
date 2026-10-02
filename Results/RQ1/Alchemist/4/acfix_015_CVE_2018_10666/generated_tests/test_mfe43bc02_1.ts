import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that removes return true from setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();
    
    // For ethers v6, we decode the return value from the transaction
    const iface = new ethers.Interface([
      "function setOwner(address _owner) public returns (bool success)"
    ]);
    const decodedData = iface.decodeFunctionResult("setOwner", 
      (await ethers.provider.getTransaction(tx.hash)).data
    );
    
    // The mutated function would not return true, so this assertion should fail
    expect(decodedData.success).to.equal(true);
  });
});