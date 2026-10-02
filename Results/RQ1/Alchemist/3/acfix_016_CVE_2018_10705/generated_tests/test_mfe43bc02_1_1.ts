import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when owner calls setOwner (kills mutant mfe43bc02)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner as owner and capture the return value
    const tx = await instance.connect(owner).setOwner(addr1.address);
    const receipt = await tx.wait();
    
    // In ethers v6, we need to decode the return value from the transaction
    const iface = new ethers.Interface([
      "function setOwner(address _owner) public returns (bool success)"
    ]);
    const decodedData = iface.decodeFunctionResult("setOwner", tx.data);
    
    // The mutant removed "return true" so the function will return false by default
    expect(decodedData[0]).to.equal(true);
  });
});