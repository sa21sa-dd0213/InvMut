import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is successful, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed based on the provided code)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like token to use as caddress for testing
    const TokenFactory = await ethers.getContractFactory("contracts/TestERC20.sol:TestERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare transfer parameters
    const recipients = [addr1.address, addr2.address];
    const amount = ethers.parseEther("10");

    // Call transfer function - this should return true in original, false in mutant
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      amount
    );
    const receipt = await tx.wait();

    // Check the return value from the transaction
    // In ethers v6, we can decode the return value from the transaction response
    const iface = new ethers.Interface(["function transfer(address from, address caddress, address[] memory _tos, uint v) public returns (bool)"]);
    const decodedReturn = iface.decodeFunctionResult("transfer", tx.data);

    // The original returns true, the mutant returns false
    expect(decodedReturn[0]).to.equal(true);
  });
});