import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should return true from transfer when mutation removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a simple ERC20 token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Fund owner with tokens and approve the AirDropContract to transferFrom
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare recipients and values
    const recipients = [addr1.address, addr2.address];
    const values = [ethers.parseEther("10"), ethers.parseEther("20")];
    
    // Call transfer and expect it to return true
    const tx = await instance.transfer(await token.getAddress(), recipients, values);
    const receipt = await tx.wait();
    
    // The original returns true, mutant returns false
    // We check the return value via the transaction result
    expect(receipt).to.not.be.undefined;
    
    // For ethers v6, we can decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address,address[],uint256[]) returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", tx.data);
    
    // The mutant removes "return true" so it will return false by default
    expect(decodedData[0]).to.equal(true);
  });
});