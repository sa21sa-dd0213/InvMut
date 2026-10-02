import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - maf15ef8f", function () {
  it("should detect mutant that removes return true by checking return value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed based on the contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data: valid transfer parameters
    const from = owner.address;
    const tokenAddress = owner.address; // Using a simple address as token contract
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("1"), ethers.parseEther("2")];

    // Call transfer and capture the return value
    const tx = await instance.transfer(from, tokenAddress, recipients, amounts);
    const receipt = await tx.wait();
    
    // Get the return value from the transaction
    // Since the function returns bool, we can decode the result
    const iface = new ethers.Interface(["function transfer(address,address,address[],uint256[]) returns (bool)"]);
    const decodedResult = iface.decodeFunctionResult("transfer", receipt.logs.length > 0 ? receipt.logs[0].data : "0x");
    
    // For a direct call we can also use staticCall to check the return value
    const result = await instance.transfer.staticCall(from, tokenAddress, recipients, amounts);
    
    // The original returns true, the mutant returns false (no explicit return)
    expect(result).to.equal(true);
  });
});