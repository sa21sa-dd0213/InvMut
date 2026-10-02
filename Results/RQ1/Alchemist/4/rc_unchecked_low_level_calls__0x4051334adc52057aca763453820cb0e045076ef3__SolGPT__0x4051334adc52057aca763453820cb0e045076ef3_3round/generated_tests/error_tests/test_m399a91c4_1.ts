import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m399a91c4 detection", function () {
  it("should return true when transfer succeeds on original, but fail on mutant that removed return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for airdrop)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a simple ERC20-like token to test transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to owner and approve the airdrop contract to transferFrom
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(await instance.getAddress(), mintAmount);
    
    // Prepare transfer parameters
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");
    
    // Call transfer and capture the return value
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      transferAmount
    );
    const receipt = await tx.wait();
    
    // The return value is captured from the transaction result
    // In ethers v6, we need to decode the return value from the transaction
    const iface = new ethers.Interface(["function transfer(address from,address caddress,address[] memory _tos,uint v) public returns (bool)"]);
    const decodedData = iface.decodeFunctionResult("transfer", receipt.logs[0].data);
    const result = decodedData[0];
    
    // Assert that the function returned true
    expect(result).to.equal(true);
  });
});