import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - withdrawForeignTokens return value", function () {
  it("should return true when calling withdrawForeignTokens with a valid token contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Transfer some tokens to the XBORNID contract
    const tokenAmount = ethers.parseEther("100");
    await token.transfer(await instance.getAddress(), tokenAmount);

    // Call withdrawForeignTokens and capture the return value
    const tx = await instance.connect(owner).withdrawForeignTokens(await token.getAddress());
    const receipt = await tx.wait();

    // Check that the transaction succeeded (the function returned true)
    // In ethers v6, we can check the decoded return value from the transaction
    const iface = new ethers.Interface([
      "function withdrawForeignTokens(address _tokenContract) public returns (bool)"
    ]);
    
    // Decode the return data from the transaction receipt
    const returnData = receipt.logs.length > 0 ? receipt.logs[0].data : tx.data;
    const decodedData = iface.decodeFunctionResult("withdrawForeignTokens", returnData);
    expect(decodedData[0]).to.equal(true);
  });
});