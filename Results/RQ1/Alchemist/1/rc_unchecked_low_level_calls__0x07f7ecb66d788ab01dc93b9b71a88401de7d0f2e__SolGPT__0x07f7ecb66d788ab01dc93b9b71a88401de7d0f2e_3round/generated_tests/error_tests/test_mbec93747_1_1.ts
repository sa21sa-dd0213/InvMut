import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant mbec93747 test", function () {
  it("should return true when transferAnyERC20Token succeeds, but mutant returns false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PoCGame with required constructor arguments
    const Factory = await ethers.getContractFactory("PoCGame");
    const whaleAddress = addr1.address;
    const wagerLimit = ethers.parseEther("1");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token for testing
    const SimpleToken = await ethers.getContractFactory("SimpleERC20");
    const token = await SimpleToken.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Transfer some tokens to the PoCGame contract
    await token.transfer(await instance.getAddress(), ethers.parseEther("100"));
    
    // Call transferAnyERC20Token as owner (authorized)
    const tx = await instance.connect(owner).transferAnyERC20Token(
      await token.getAddress(),
      owner.address,
      ethers.parseEther("10")
    );
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    // Check if the transfer actually happened
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("910")); // 1000 - 100 + 10 = 910
    
    // Decode the return data from the transaction
    const iface = new ethers.Interface([
      "function transferAnyERC20Token(address tokenAddress, address tokenOwner, uint tokens) returns (bool)"
    ]);
    
    // Get the return data from the transaction receipt
    const returnData = receipt?.logs[0]?.data || "0x";
    
    if (returnData !== "0x" && returnData.length > 2) {
      // Try to decode the return value
      try {
        const decoded = iface.decodeFunctionResult("transferAnyERC20Token", returnData);
        if (decoded && decoded.length > 0) {
          // Original contract returns true
          expect(decoded[0]).to.equal(true);
        } else {
          // Mutant doesn't return anything - this would fail the test
          expect.fail("Mutant detected: function did not return boolean value");
        }
      } catch {
        // If decoding fails, it's likely the mutant that doesn't return a value
        expect.fail("Mutant detected: function did not return boolean value");
      }
    } else {
      // No return data means the function didn't return a boolean (mutant behavior)
      expect.fail("Mutant detected: function did not return boolean value");
    }
  });
});